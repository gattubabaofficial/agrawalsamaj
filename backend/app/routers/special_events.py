import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.dependencies import get_current_user, is_admin_level
from app.models.user import User
from app.models.booking import (
    Room, SpecialEvent, SpecialEventDateRange, SpecialEventRoomConfig,
)

router = APIRouter(prefix="/api/v1/special-events", tags=["special-events"])


def _require_admin(current_user: User):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")


# ───────────────────────── Schemas ─────────────────────────
class DateRangeIn(BaseModel):
    start_date: date
    end_date: date


class DateRangeOut(DateRangeIn):
    range_id: uuid.UUID

    class Config:
        from_attributes = True


class RoomConfigIn(BaseModel):
    room_id: uuid.UUID
    special_price_per_day: Optional[float] = None
    is_available: bool = True
    min_days: Optional[int] = Field(default=None, ge=1)
    max_days: Optional[int] = Field(default=None, ge=1)


class RoomConfigOut(RoomConfigIn):
    config_id: uuid.UUID
    room_name: Optional[str] = None

    class Config:
        from_attributes = True


class SpecialEventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    priority: int = 100
    block_unlisted_rooms: bool = False
    date_ranges: List[DateRangeIn]
    room_configs: List[RoomConfigIn] = []


class SpecialEventResponse(BaseModel):
    event_id: uuid.UUID
    name: str
    description: Optional[str]
    is_active: bool
    priority: int
    block_unlisted_rooms: bool
    date_ranges: List[DateRangeOut]
    room_configs: List[RoomConfigOut]

    class Config:
        from_attributes = True


# ───────────────────────── Helpers ─────────────────────────
async def _load_event(db: AsyncSession, event_id: uuid.UUID) -> SpecialEvent:
    result = await db.execute(
        select(SpecialEvent)
        .options(
            selectinload(SpecialEvent.date_ranges),
            selectinload(SpecialEvent.room_configs).selectinload(SpecialEventRoomConfig.room),
        )
        .where(SpecialEvent.event_id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Special event not found")
    return event


def _serialize(event: SpecialEvent) -> dict:
    return {
        "event_id": event.event_id,
        "name": event.name,
        "description": event.description,
        "is_active": event.is_active,
        "priority": event.priority,
        "block_unlisted_rooms": event.block_unlisted_rooms,
        "date_ranges": [
            {"range_id": r.range_id, "start_date": r.start_date, "end_date": r.end_date}
            for r in event.date_ranges
        ],
        "room_configs": [
            {
                "config_id": c.config_id,
                "room_id": c.room_id,
                "room_name": c.room.name if c.room else None,
                "special_price_per_day": float(c.special_price_per_day) if c.special_price_per_day is not None else None,
                "is_available": c.is_available,
                "min_days": c.min_days,
                "max_days": c.max_days,
            }
            for c in event.room_configs
        ],
    }


async def _check_conflicts(
    db: AsyncSession,
    date_ranges: List[DateRangeIn],
    room_ids: List[uuid.UUID],
    exclude_event_id: Optional[uuid.UUID] = None,
):
    """Reject if another *active* event already has a config for one of these
    rooms with a date range overlapping one of the incoming ranges."""
    if not room_ids:
        return
    for room_id in room_ids:
        for rng in date_ranges:
            query = (
                select(SpecialEvent)
                .join(SpecialEventDateRange, SpecialEventDateRange.event_id == SpecialEvent.event_id)
                .join(
                    SpecialEventRoomConfig,
                    (SpecialEventRoomConfig.event_id == SpecialEvent.event_id)
                    & (SpecialEventRoomConfig.room_id == room_id),
                )
                .where(
                    SpecialEvent.is_active == True,  # noqa: E712
                    SpecialEventDateRange.start_date <= rng.end_date,
                    SpecialEventDateRange.end_date >= rng.start_date,
                )
            )
            if exclude_event_id is not None:
                query = query.where(SpecialEvent.event_id != exclude_event_id)
            conflicting = (await db.execute(query)).scalars().first()
            if conflicting:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Another special event ('{conflicting.name}') already covers "
                        f"one of these rooms for overlapping dates "
                        f"({rng.start_date.isoformat()} - {rng.end_date.isoformat()})."
                    ),
                )


def _validate_ranges(date_ranges: List[DateRangeIn]):
    if not date_ranges:
        raise HTTPException(status_code=400, detail="At least one date range is required.")
    for rng in date_ranges:
        if rng.end_date < rng.start_date:
            raise HTTPException(status_code=400, detail="Each date range's end date must be on or after its start date.")


# ───────────────────────── Routes ─────────────────────────
@router.get("/", response_model=List[SpecialEventResponse])
async def list_special_events(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(
        select(SpecialEvent)
        .options(
            selectinload(SpecialEvent.date_ranges),
            selectinload(SpecialEvent.room_configs).selectinload(SpecialEventRoomConfig.room),
        )
        .order_by(SpecialEvent.created_at.desc())
    )
    events = result.scalars().unique().all()
    return [_serialize(e) for e in events]


@router.get("/{event_id}", response_model=SpecialEventResponse)
async def get_special_event(event_id: uuid.UUID, db: AsyncSession = Depends(get_db_session)):
    event = await _load_event(db, event_id)
    return _serialize(event)


@router.post("/", response_model=SpecialEventResponse, status_code=201)
async def create_special_event(
    data: SpecialEventCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    _validate_ranges(data.date_ranges)

    room_ids = [c.room_id for c in data.room_configs]
    if room_ids:
        rooms = (await db.execute(select(Room).where(Room.room_id.in_(room_ids)))).scalars().all()
        if len(rooms) != len(set(room_ids)):
            raise HTTPException(status_code=400, detail="One or more room_id values are invalid.")

    await _check_conflicts(db, data.date_ranges, room_ids)

    event = SpecialEvent(
        name=data.name,
        description=data.description,
        is_active=data.is_active,
        priority=data.priority,
        block_unlisted_rooms=data.block_unlisted_rooms,
        created_by=current_user.user_id,
    )
    event.date_ranges = [SpecialEventDateRange(start_date=r.start_date, end_date=r.end_date) for r in data.date_ranges]
    event.room_configs = [
        SpecialEventRoomConfig(
            room_id=c.room_id,
            special_price_per_day=c.special_price_per_day,
            is_available=c.is_available,
            min_days=c.min_days,
            max_days=c.max_days,
        )
        for c in data.room_configs
    ]
    db.add(event)
    await db.commit()
    return _serialize(await _load_event(db, event.event_id))


@router.put("/{event_id}", response_model=SpecialEventResponse)
async def update_special_event(
    event_id: uuid.UUID,
    data: SpecialEventCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    _validate_ranges(data.date_ranges)

    event = await _load_event(db, event_id)

    room_ids = [c.room_id for c in data.room_configs]
    if room_ids:
        rooms = (await db.execute(select(Room).where(Room.room_id.in_(room_ids)))).scalars().all()
        if len(rooms) != len(set(room_ids)):
            raise HTTPException(status_code=400, detail="One or more room_id values are invalid.")

    await _check_conflicts(db, data.date_ranges, room_ids, exclude_event_id=event_id)

    event.name = data.name
    event.description = data.description
    event.is_active = data.is_active
    event.priority = data.priority
    event.block_unlisted_rooms = data.block_unlisted_rooms
    # Reassigning these relationship lists deletes the orphaned old rows
    # (cascade="all, delete-orphan") and inserts the new ones on flush.
    event.date_ranges = [SpecialEventDateRange(start_date=r.start_date, end_date=r.end_date) for r in data.date_ranges]
    event.room_configs = [
        SpecialEventRoomConfig(
            room_id=c.room_id,
            special_price_per_day=c.special_price_per_day,
            is_available=c.is_available,
            min_days=c.min_days,
            max_days=c.max_days,
        )
        for c in data.room_configs
    ]
    await db.commit()
    return _serialize(await _load_event(db, event_id))


@router.delete("/{event_id}", status_code=204)
async def delete_special_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    event = await _load_event(db, event_id)
    await db.delete(event)
    await db.commit()


@router.post("/{event_id}/activate", response_model=SpecialEventResponse)
async def activate_special_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    event = await _load_event(db, event_id)
    # Re-activating must not silently create a conflict with another active event.
    ranges = [DateRangeIn(start_date=r.start_date, end_date=r.end_date) for r in event.date_ranges]
    room_ids = [c.room_id for c in event.room_configs]
    await _check_conflicts(db, ranges, room_ids, exclude_event_id=event_id)
    event.is_active = True
    await db.commit()
    return _serialize(await _load_event(db, event_id))


@router.post("/{event_id}/deactivate", response_model=SpecialEventResponse)
async def deactivate_special_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    event = await _load_event(db, event_id)
    event.is_active = False
    await db.commit()
    return _serialize(await _load_event(db, event_id))
