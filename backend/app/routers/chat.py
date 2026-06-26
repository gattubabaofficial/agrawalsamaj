import uuid
from datetime import datetime
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, distinct
from pydantic import BaseModel

from app.database import get_db_session
from app.models.user import User, UserRole
from app.models.chat import Group, GroupMember, Message, GroupType
from app.dependencies import get_current_user
from jose import JWTError, jwt
from app.config import settings

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# Real-time WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Maps user_id (str representation) to a list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_group(self, message: dict, member_ids: List[str]):
        for uid in member_ids:
            await self.send_personal_message(message, uid)

manager = ConnectionManager()


# Request schemas
class SendMessageSchema(BaseModel):
    content: str

class SendGroupMessageSchema(BaseModel):
    content: str


# Helper to ensure default groups and enroll users based on rules
async def ensure_default_groups_and_membership(user: User, db: AsyncSession):
    # 1. Default Groups Definition
    default_groups = [
        {"name": "Members Only", "type": GroupType.MEMBER, "location": None},
        {"name": "General Users", "type": GroupType.NON_MEMBER, "location": None},
        {"name": "Mansarovar Group", "type": GroupType.LOCATION, "location": "Mansarovar"},
        {"name": "Patrakar Colony Group", "type": GroupType.LOCATION, "location": "Patrakar Colony"},
        {"name": "Khushi Vihar Group", "type": GroupType.LOCATION, "location": "Khushi Vihar"},
        {"name": "Pratap Nagar Group", "type": GroupType.LOCATION, "location": "Pratap Nagar"},
        {"name": "Vaishali Nagar Group", "type": GroupType.LOCATION, "location": "Vaishali Nagar"},
    ]

    groups_map = {}
    for g_def in default_groups:
        stmt = select(Group).where(Group.name == g_def["name"])
        res = await db.execute(stmt)
        group = res.scalars().first()
        if not group:
            group = Group(
                name=g_def["name"],
                type=g_def["type"],
                location=g_def["location"]
            )
            db.add(group)
            await db.flush()
        groups_map[g_def["name"]] = group

    # 2. Check and Sync "Members Only" group membership
    members_group = groups_map["Members Only"]
    members_stmt = select(GroupMember).where(
        GroupMember.group_id == members_group.group_id,
        GroupMember.user_id == user.user_id
    )
    is_in_members_group = (await db.execute(members_stmt)).scalars().first() is not None

    user_is_member = (user.role == UserRole.MEMBER or user.is_member or user.role == UserRole.ADMIN)
    if user_is_member and not is_in_members_group:
        db.add(GroupMember(group_id=members_group.group_id, user_id=user.user_id))
    elif not user_is_member and is_in_members_group:
        # Delete membership
        del_stmt = select(GroupMember).where(
            GroupMember.group_id == members_group.group_id,
            GroupMember.user_id == user.user_id
        )
        to_del = (await db.execute(del_stmt)).scalars().first()
        if to_del:
            await db.delete(to_del)

    # 3. Check and Sync "General Users" group membership
    general_group = groups_map["General Users"]
    general_stmt = select(GroupMember).where(
        GroupMember.group_id == general_group.group_id,
        GroupMember.user_id == user.user_id
    )
    is_in_general_group = (await db.execute(general_stmt)).scalars().first() is not None

    user_is_guest = (user.role == UserRole.GUEST and not user.is_member)
    if user_is_guest and not is_in_general_group:
        db.add(GroupMember(group_id=general_group.group_id, user_id=user.user_id))
    elif not user_is_guest and is_in_general_group:
        # Delete membership
        del_stmt = select(GroupMember).where(
            GroupMember.group_id == general_group.group_id,
            GroupMember.user_id == user.user_id
        )
        to_del = (await db.execute(del_stmt)).scalars().first()
        if to_del:
            await db.delete(to_del)

    # 4. Auto-enroll in location group if address matches
    if user.address:
        addr_lower = user.address.lower()
        for g_name, g_obj in groups_map.items():
            if g_obj.type == GroupType.LOCATION and g_obj.location:
                loc_lower = g_obj.location.lower()
                if loc_lower in addr_lower:
                    loc_stmt = select(GroupMember).where(
                        GroupMember.group_id == g_obj.group_id,
                        GroupMember.user_id == user.user_id
                    )
                    is_in_loc = (await db.execute(loc_stmt)).scalars().first() is not None
                    if not is_in_loc:
                        db.add(GroupMember(group_id=g_obj.group_id, user_id=user.user_id))

    await db.commit()


@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Returns a unified list of active personal DM chats and groups the user belongs to.
    """
    await ensure_default_groups_and_membership(current_user, db)

    conversations = []

    # 1. Fetch DMs the user is involved in
    # Get all distinct user IDs that current_user has messaged or received messages from
    stmt_dm = select(Message).where(
        and_(
            Message.group_id.is_(None),
            or_(
                Message.sender_id == current_user.user_id,
                Message.receiver_id == current_user.user_id
            )
        )
    ).order_by(Message.sent_at.desc())

    dm_res = await db.execute(stmt_dm)
    all_dm_messages = dm_res.scalars().all()

    processed_users = set()
    for msg in all_dm_messages:
        counterpart_id = msg.receiver_id if msg.sender_id == current_user.user_id else msg.sender_id
        if not counterpart_id or counterpart_id in processed_users:
            continue
        
        processed_users.add(counterpart_id)
        
        # Get counterpart details
        u_res = await db.execute(select(User).where(User.user_id == counterpart_id))
        c_user = u_res.scalars().first()
        if not c_user:
            continue

        conversations.append({
            "type": "personal",
            "id": str(c_user.user_id),
            "name": f"{c_user.first_name} {c_user.surname}",
            "role": c_user.role,
            "is_member": c_user.is_member,
            "profile_photo": c_user.profile_photo,
            "last_message": msg.content,
            "last_message_time": msg.sent_at.isoformat(),
            "unread_count": 0 # Simple mock count, can be extended if needed
        })

    # 2. Fetch Groups user belongs to
    grp_stmt = select(Group).join(
        GroupMember, Group.group_id == GroupMember.group_id
    ).where(GroupMember.user_id == current_user.user_id)
    
    grp_res = await db.execute(grp_stmt)
    my_groups = grp_res.scalars().all()

    for grp in my_groups:
        # Get last message of this group
        msg_stmt = select(Message).where(
            Message.group_id == grp.group_id
        ).order_by(Message.sent_at.desc()).limit(1)
        
        g_msg = (await db.execute(msg_stmt)).scalars().first()
        
        conversations.append({
            "type": "group",
            "id": str(grp.group_id),
            "name": grp.name,
            "group_type": grp.type,
            "location": grp.location,
            "profile_photo": None,
            "last_message": g_msg.content if g_msg else "No messages yet",
            "last_message_time": g_msg.sent_at.isoformat() if g_msg else grp.created_at.isoformat(),
            "unread_count": 0
        })

    # Sort conversations by last message time descending
    conversations.sort(key=lambda x: x["last_message_time"], reverse=True)
    return conversations


@router.get("/messages/{user_id}")
async def get_personal_messages(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get personal message history between current_user and target user_id.
    Strictly filters so only sender/receiver can view.
    """
    target_uuid = uuid.UUID(user_id)
    
    # Check if target user exists
    target_user = (await db.execute(select(User).where(User.user_id == target_uuid))).scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    stmt = select(Message).where(
        and_(
            Message.group_id.is_(None),
            or_(
                and_(Message.sender_id == current_user.user_id, Message.receiver_id == target_uuid),
                and_(Message.sender_id == target_uuid, Message.receiver_id == current_user.user_id)
            )
        )
    ).order_by(Message.sent_at.asc())

    res = await db.execute(stmt)
    messages = res.scalars().all()

    return [{
        "message_id": str(m.message_id),
        "sender_id": str(m.sender_id),
        "receiver_id": str(m.receiver_id),
        "content": m.content,
        "sent_at": m.sent_at.isoformat(),
        "is_read": m.is_read
    } for m in messages]


@router.post("/messages")
async def send_personal_message(
    body: SendMessageSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Send direct message to another user.
    """
    # Parse receiver_id from custom headers or query params
    # We can check body/recipient
    pass

@router.post("/messages/{receiver_id}")
async def send_personal_message_to(
    receiver_id: str,
    body: SendMessageSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    target_uuid = uuid.UUID(receiver_id)
    
    target_user = (await db.execute(select(User).where(User.user_id == target_uuid))).scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    new_msg = Message(
        sender_id=current_user.user_id,
        receiver_id=target_uuid,
        group_id=None,
        content=body.content
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    payload = {
        "type": "personal",
        "message_id": str(new_msg.message_id),
        "sender_id": str(new_msg.sender_id),
        "sender_name": f"{current_user.first_name} {current_user.surname}",
        "receiver_id": str(new_msg.receiver_id),
        "content": new_msg.content,
        "sent_at": new_msg.sent_at.isoformat()
    }

    # Broadcast via WebSockets
    await manager.send_personal_message(payload, str(target_uuid))
    await manager.send_personal_message(payload, str(current_user.user_id))

    return payload


@router.get("/groups")
async def list_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get all chat groups, detailing which ones the user has joined or can join.
    """
    await ensure_default_groups_and_membership(current_user, db)

    stmt = select(Group).order_by(Group.type, Group.name)
    res = await db.execute(stmt)
    all_groups = res.scalars().all()

    my_memberships = await db.execute(
        select(GroupMember.group_id).where(GroupMember.user_id == current_user.user_id)
    )
    joined_ids = set(my_memberships.scalars().all())

    data = []
    for g in all_groups:
        data.append({
            "group_id": str(g.group_id),
            "name": g.name,
            "type": g.type,
            "location": g.location,
            "is_joined": g.group_id in joined_ids
        })
    return data


@router.post("/groups/{group_id}/join")
async def join_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    group_uuid = uuid.UUID(group_id)
    group = (await db.execute(select(Group).where(Group.group_id == group_uuid))).scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Enforce role logic for default groups
    if group.type == GroupType.MEMBER and not (current_user.is_member or current_user.role in [UserRole.MEMBER, UserRole.ADMIN]):
        raise HTTPException(status_code=403, detail="Only registered members can join this group.")

    stmt = select(GroupMember).where(
        GroupMember.group_id == group_uuid,
        GroupMember.user_id == current_user.user_id
    )
    existing = (await db.execute(stmt)).scalars().first()
    if not existing:
        db.add(GroupMember(group_id=group_uuid, user_id=current_user.user_id))
        await db.commit()

    return {"message": f"Successfully joined group '{group.name}'"}


@router.post("/groups/{group_id}/leave")
async def leave_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    group_uuid = uuid.UUID(group_id)
    group = (await db.execute(select(Group).where(Group.group_id == group_uuid))).scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.type in [GroupType.MEMBER, GroupType.NON_MEMBER]:
        raise HTTPException(status_code=400, detail="Cannot leave system default groups.")

    stmt = select(GroupMember).where(
        GroupMember.group_id == group_uuid,
        GroupMember.user_id == current_user.user_id
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        await db.delete(existing)
        await db.commit()

    return {"message": f"Successfully left group '{group.name}'"}


@router.get("/groups/{group_id}/messages")
async def get_group_messages(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    group_uuid = uuid.UUID(group_id)
    
    # Verify user is member of the group
    is_mem = (await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_uuid, GroupMember.user_id == current_user.user_id)
    )).scalars().first()
    if not is_mem:
        raise HTTPException(status_code=403, detail="You must be a member of this group to view messages.")

    stmt = select(Message).where(
        Message.group_id == group_uuid
    ).order_by(Message.sent_at.asc())

    res = await db.execute(stmt)
    messages = res.scalars().all()

    data = []
    for m in messages:
        sender_res = await db.execute(select(User).where(User.user_id == m.sender_id))
        sender = sender_res.scalars().first()
        data.append({
            "message_id": str(m.message_id),
            "sender_id": str(m.sender_id),
            "sender_name": f"{sender.first_name} {sender.surname}" if sender else "Unknown User",
            "content": m.content,
            "sent_at": m.sent_at.isoformat()
        })
    return data


@router.post("/groups/{group_id}/messages")
async def send_group_message(
    group_id: str,
    body: SendGroupMessageSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    group_uuid = uuid.UUID(group_id)
    
    # Verify user is member of the group
    is_mem = (await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_uuid, GroupMember.user_id == current_user.user_id)
    )).scalars().first()
    if not is_mem:
        raise HTTPException(status_code=403, detail="You must join this group first to send messages.")

    new_msg = Message(
        sender_id=current_user.user_id,
        receiver_id=None,
        group_id=group_uuid,
        content=body.content
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    # Fetch all group members to broadcast to
    m_stmt = select(GroupMember.user_id).where(GroupMember.group_id == group_uuid)
    members_res = await db.execute(m_stmt)
    group_member_ids = [str(uid) for uid in members_res.scalars().all()]

    payload = {
        "type": "group",
        "group_id": str(group_uuid),
        "message_id": str(new_msg.message_id),
        "sender_id": str(new_msg.sender_id),
        "sender_name": f"{current_user.first_name} {current_user.surname}",
        "content": new_msg.content,
        "sent_at": new_msg.sent_at.isoformat()
    }

    # Broadcast via websocket
    await manager.broadcast_to_group(payload, group_member_ids)

    return payload


# Real-time WebSocket connection
@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket, token: Optional[str] = None, db: AsyncSession = Depends(get_db_session)):
    if not token:
        # Try reading from query parameters
        token = websocket.query_params.get("token")
        
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_uuid = uuid.UUID(user_id)
        result = await db.execute(select(User).where(User.user_id == user_uuid))
        user = result.scalars().first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = str(user.user_id)
    await manager.connect(user_id_str, websocket)
    
    try:
        while True:
            # We keep connection open, client sends messages via HTTP REST API
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id_str, websocket)
    except Exception:
        manager.disconnect(user_id_str, websocket)
