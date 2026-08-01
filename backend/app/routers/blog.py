import os
import uuid
import re
import shutil
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user, get_optional_current_user
from app.models.user import User, UserRole
from app.models.blog import Blog, BlogComment, BlogLike, BlogStatus

router = APIRouter(prefix="/api/v1/blog", tags=["Blog"])

UPLOAD_BASE = Path("uploads")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ─── Schemas ──────────────────────────────────────────────────────────────────

class BlogCreate(BaseModel):
    title: str
    content: str
    cover_image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: BlogStatus = BlogStatus.DRAFT
    # Guest author info — required when not logged in
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    cover_image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[BlogStatus] = None


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[uuid.UUID] = None
    guest_name: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:200]


def user_dict(user: User) -> dict:
    return {
        "user_id": str(user.user_id),
        "first_name": user.first_name,
        "surname": user.surname,
        "profile_photo": user.profile_photo,
    }


def comment_dict(comment: BlogComment, include_replies: bool = True) -> dict:
    author = user_dict(comment.author) if comment.author else {
        "user_id": None,
        "first_name": comment.guest_name or "Guest",
        "surname": "",
        "profile_photo": None,
    }
    return {
        "comment_id": str(comment.comment_id),
        "blog_id": str(comment.blog_id),
        "user_id": str(comment.user_id) if comment.user_id else None,
        "author": author,
        "content": comment.content,
        "parent_id": str(comment.parent_id) if comment.parent_id else None,
        "created_at": comment.created_at.isoformat() + "Z" if comment.created_at else None,
        "replies": [comment_dict(r, include_replies=False) for r in (comment.replies or [])] if include_replies else [],
    }


def blog_dict(blog: Blog, like_count: int = 0, user_liked: bool = False, comment_count: int = 0) -> dict:
    # If guest fields are set, show guest as the display author
    author_display = user_dict(blog.author) if blog.author else None
    if getattr(blog, 'guest_name', None):
        author_display = {
            "user_id": None,
            "first_name": blog.guest_name,
            "surname": "",
            "profile_photo": None,
        }
    return {
        "blog_id": str(blog.blog_id),
        "author_id": str(blog.author_id),
        "author": author_display,
        "title": blog.title,
        "slug": blog.slug,
        "content": blog.content,
        "cover_image_url": blog.cover_image_url,
        "tags": blog.tags or [],
        "status": blog.status,
        "views": blog.views,
        "guest_name": getattr(blog, 'guest_name', None),
        "guest_email": getattr(blog, 'guest_email', None),
        "guest_phone": getattr(blog, 'guest_phone', None),
        "like_count": like_count,
        "user_liked": user_liked,
        "comment_count": comment_count,
        "created_at": blog.created_at.isoformat() + "Z" if blog.created_at else None,
        "updated_at": blog.updated_at.isoformat() + "Z" if blog.updated_at else None,
    }


async def get_blog_stats(db: AsyncSession, blog_id: uuid.UUID, user_id: Optional[uuid.UUID] = None, guest_id: Optional[str] = None):
    like_count = await db.scalar(
        select(func.count()).select_from(BlogLike).where(BlogLike.blog_id == blog_id)
    )
    comment_count = await db.scalar(
        select(func.count()).select_from(BlogComment).where(BlogComment.blog_id == blog_id)
    )
    user_liked = False
    if user_id:
        existing = await db.scalar(
            select(BlogLike).where(BlogLike.blog_id == blog_id, BlogLike.user_id == user_id)
        )
        user_liked = existing is not None
    elif guest_id:
        existing = await db.scalar(
            select(BlogLike).where(BlogLike.blog_id == blog_id, BlogLike.guest_id == guest_id)
        )
        user_liked = existing is not None
    return like_count or 0, user_liked, comment_count or 0


# ─── File Upload ──────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload image or video for blog content. Stored in uploads/blogs/"""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    blogs_dir = UPLOAD_BASE / "blogs"
    blogs_dir.mkdir(parents=True, exist_ok=True)

    # Unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = blogs_dir / unique_name

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Max 20 MB.",
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/blogs/{unique_name}"
    return {"url": file_url, "filename": unique_name}


# ─── Public Endpoints ─────────────────────────────────────────────────────────

@router.get("/")
async def list_blogs(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    tag: Optional[str] = None,
    search: Optional[str] = None,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all published blogs with search, tag, year, and month filters."""
    query = (
        select(Blog)
        .options(selectinload(Blog.author))
        .where(Blog.status == BlogStatus.PUBLISHED)
        .order_by(desc(Blog.created_at))
    )
    if search:
        query = query.where(Blog.title.ilike(f"%{search}%"))

    result = await db.execute(query)
    blogs = result.scalars().all()

    # Tag filter (JSON list in SQLite — filter in Python)
    if tag:
        blogs = [b for b in blogs if b.tags and tag.lower() in [t.lower() for t in b.tags]]

    # Year filter
    if year:
        blogs = [b for b in blogs if b.created_at and b.created_at.year == year]

    # Month filter
    if month:
        blogs = [b for b in blogs if b.created_at and b.created_at.month == month]

    total = len(blogs)
    start = (page - 1) * per_page
    blogs = blogs[start: start + per_page]

    items = []
    for blog in blogs:
        like_count, _, comment_count = await get_blog_stats(db, blog.blog_id)
        # Return preview (first 300 chars of content)
        preview = blog.content[:300] + ("..." if len(blog.content) > 300 else "")
        d = blog_dict(blog, like_count, False, comment_count)
        d["content_preview"] = preview
        d["content"] = None  # Don't send full content in listing
        items.append(d)

    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/admin/all")
async def list_all_blogs_admin(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin/Member: list blogs for management. Admin sees all, Member sees their own."""
    if current_user.role not in [UserRole.ADMIN, UserRole.MEMBER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = select(Blog).options(selectinload(Blog.author)).order_by(desc(Blog.created_at))
    if current_user.role == UserRole.MEMBER:
        query = query.where(Blog.author_id == current_user.user_id)
        
    result = await db.execute(query)
    blogs = result.scalars().all()
    total = len(blogs)
    start = (page - 1) * per_page
    blogs = blogs[start: start + per_page]

    items = []
    for blog in blogs:
        like_count, _, comment_count = await get_blog_stats(db, blog.blog_id)
        d = blog_dict(blog, like_count, False, comment_count)
        d["content"] = None
        items.append(d)

    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{slug}")
async def get_blog(
    slug: str,
    guest_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single blog by slug (public). Increments view counter."""
    result = await db.execute(select(Blog).options(selectinload(Blog.author)).where(Blog.slug == slug))
    blog = result.scalar_one_or_none()
    if not blog or blog.status != BlogStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Increment views
    blog.views += 1
    await db.commit()
    await db.refresh(blog)

    user_id = current_user.user_id if current_user else None
    like_count, user_liked, comment_count = await get_blog_stats(db, blog.blog_id, user_id=user_id, guest_id=guest_id)
    return blog_dict(blog, like_count, user_liked, comment_count)



# ─── Blog Writing & Admin CRUD ───────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_blog(
    data: BlogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Allow anyone (logged in or guest) to write & publish a blog without prior verification."""
    try:
        author_id = current_user.user_id if current_user else None
        if not author_id:
            # Guest must provide name, email, and phone
            if not data.guest_name or not data.guest_name.strip():
                raise HTTPException(status_code=400, detail="Name is required for guest authors")
            if not data.guest_email or not data.guest_email.strip():
                raise HTTPException(status_code=400, detail="Email is required for guest authors")
            if not data.guest_phone or not data.guest_phone.strip():
                raise HTTPException(status_code=400, detail="Phone number is required for guest authors")
            # Assign to the first admin user for the FK constraint
            first_user = await db.scalar(select(User).order_by(User.created_at.asc()).limit(1))
            author_id = first_user.user_id if first_user else None

        base_slug = slugify(data.title)
        slug = base_slug
        # Ensure slug uniqueness
        counter = 1
        while await db.scalar(select(Blog).where(Blog.slug == slug)):
            slug = f"{base_slug}-{counter}"
            counter += 1

        blog = Blog(
            author_id=author_id,
            title=data.title,
            slug=slug,
            content=data.content,
            cover_image_url=data.cover_image_url,
            tags=data.tags,
            status=data.status,
            guest_name=data.guest_name.strip() if data.guest_name else None,
            guest_email=data.guest_email.strip() if data.guest_email else None,
            guest_phone=data.guest_phone.strip() if data.guest_phone else None,
        )
        db.add(blog)
        await db.commit()
        await db.refresh(blog)
        # Load author relationship for the response
        result = await db.execute(
            select(Blog).options(selectinload(Blog.author)).where(Blog.blog_id == blog.blog_id)
        )
        blog = result.scalar_one()
        return blog_dict(blog)
    except Exception as e:
        import traceback
        return {"debug_error": str(e), "traceback": traceback.format_exc()}


@router.get("/debug/files")
async def debug_files():
    """Temporary debug route to list uploaded files."""
    try:
        path = Path("uploads/blogs")
        if not path.exists():
            return {"exists": False, "message": "uploads/blogs directory does not exist"}
        files = [f.name for f in path.iterdir() if f.is_file()]
        return {"exists": True, "files": files, "count": len(files)}
    except Exception as e:
        return {"error": str(e)}


@router.get("/debug/settings")
async def debug_settings():
    """Temporary debug route to check server environment variables."""
    import re
    db_masked = re.sub(r":[^:]+@", ":***@", settings.DATABASE_URL) if settings.DATABASE_URL else None
    key_masked = "***" if settings.WHATSAPP_WEB_API_KEY else None
    return {
        "WHATSAPP_WEB_URL": settings.WHATSAPP_WEB_URL,
        "WHATSAPP_PROVIDER": settings.WHATSAPP_PROVIDER,
        "OTP_PREFER_WHATSAPP": settings.OTP_PREFER_WHATSAPP,
        "ENVIRONMENT": settings.ENVIRONMENT,
        "DATABASE_URL_MASKED": db_masked,
        "WHATSAPP_WEB_API_KEY_MASKED": key_masked,
    }


@router.get("/id/{blog_id}")
async def get_blog_by_id(
    blog_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin/Member: get full blog by ID for editing."""
    if current_user.role not in [UserRole.ADMIN, UserRole.MEMBER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(Blog).options(selectinload(Blog.author)).where(Blog.blog_id == blog_id))
    blog = result.scalar_one_or_none()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    if current_user.role == UserRole.MEMBER and blog.author_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this blog")
        
    like_count, _, comment_count = await get_blog_stats(db, blog.blog_id)
    return blog_dict(blog, like_count, False, comment_count)


@router.put("/{blog_id}")
async def update_blog(
    blog_id: uuid.UUID,
    data: BlogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MEMBER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Blog).options(selectinload(Blog.author)).where(Blog.blog_id == blog_id))
    blog = result.scalar_one_or_none()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    if current_user.role == UserRole.MEMBER and blog.author_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this blog")

    if data.title is not None:
        blog.title = data.title
        # Re-slug only if title changed
        base_slug = slugify(data.title)
        slug = base_slug
        counter = 1
        while True:
            existing = await db.scalar(
                select(Blog).where(Blog.slug == slug, Blog.blog_id != blog_id)
            )
            if not existing:
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        blog.slug = slug

    if data.content is not None:
        blog.content = data.content
    if data.cover_image_url is not None:
        blog.cover_image_url = data.cover_image_url
    if data.tags is not None:
        blog.tags = data.tags
    if data.status is not None:
        blog.status = data.status

    await db.commit()
    await db.refresh(blog)
    like_count, _, comment_count = await get_blog_stats(db, blog.blog_id)
    return blog_dict(blog, like_count, False, comment_count)


@router.delete("/{blog_id}", status_code=204)
async def delete_blog(
    blog_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MEMBER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(Blog).where(Blog.blog_id == blog_id))
    blog = result.scalar_one_or_none()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    if current_user.role == UserRole.MEMBER and blog.author_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this blog")

    await db.delete(blog)
    await db.commit()


# ─── Likes ────────────────────────────────────────────────────────────────────

@router.post("/{blog_id}/like")
async def toggle_like(
    blog_id: uuid.UUID,
    guest_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    result = await db.execute(select(Blog).where(Blog.blog_id == blog_id))
    blog = result.scalar_one_or_none()
    if not blog or blog.status != BlogStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Blog not found")

    user_id = current_user.user_id if current_user else None
    if user_id:
        existing = await db.scalar(
            select(BlogLike).where(
                BlogLike.blog_id == blog_id, BlogLike.user_id == user_id
            )
        )
    elif guest_id:
        existing = await db.scalar(
            select(BlogLike).where(
                BlogLike.blog_id == blog_id, BlogLike.guest_id == guest_id
            )
        )
    else:
        guest_id = "anonymous-guest"
        existing = await db.scalar(
            select(BlogLike).where(
                BlogLike.blog_id == blog_id, BlogLike.guest_id == guest_id
            )
        )

    if existing:
        await db.delete(existing)
        liked = False
    else:
        like = BlogLike(
            blog_id=blog_id,
            user_id=user_id,
            guest_id=guest_id if not user_id else None
        )
        db.add(like)
        liked = True

    await db.commit()
    like_count = await db.scalar(
        select(func.count()).select_from(BlogLike).where(BlogLike.blog_id == blog_id)
    )
    return {"liked": liked, "like_count": like_count or 0}


# ─── Comments ─────────────────────────────────────────────────────────────────

@router.get("/{blog_id}/comments")
async def get_comments(
    blog_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BlogComment)
        .options(
            selectinload(BlogComment.author),
            selectinload(BlogComment.replies).selectinload(BlogComment.author)
        )
        .where(BlogComment.blog_id == blog_id, BlogComment.parent_id == None)
        .order_by(BlogComment.created_at)
    )
    top_level = result.scalars().all()
    return [comment_dict(c) for c in top_level]


@router.post("/{blog_id}/comments", status_code=201)
async def post_comment(
    blog_id: uuid.UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    result = await db.execute(select(Blog).where(Blog.blog_id == blog_id))
    blog = result.scalar_one_or_none()
    if not blog or blog.status != BlogStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Blog not found")

    if data.parent_id:
        parent = await db.scalar(
            select(BlogComment).where(BlogComment.comment_id == data.parent_id)
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    user_id = current_user.user_id if current_user else None
    comment = BlogComment(
        blog_id=blog_id,
        user_id=user_id,
        guest_name=data.guest_name.strip() if (not user_id and data.guest_name) else ("Guest" if not user_id else None),
        content=data.content.strip(),
        parent_id=data.parent_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    if current_user:
        comment.author = current_user
    return comment_dict(comment, include_replies=False)


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BlogComment).where(BlogComment.comment_id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    is_owner = comment.user_id == current_user.user_id
    is_admin = current_user.role == UserRole.ADMIN
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(comment)
    await db.commit()
