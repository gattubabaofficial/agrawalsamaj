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

from app.dependencies import get_db, get_current_user
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


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    cover_image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[BlogStatus] = None


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[uuid.UUID] = None


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
    return {
        "comment_id": str(comment.comment_id),
        "blog_id": str(comment.blog_id),
        "user_id": str(comment.user_id),
        "author": user_dict(comment.author) if comment.author else None,
        "content": comment.content,
        "parent_id": str(comment.parent_id) if comment.parent_id else None,
        "created_at": comment.created_at.isoformat() + "Z" if comment.created_at else None,
        "replies": [comment_dict(r, include_replies=False) for r in (comment.replies or [])] if include_replies else [],
    }


def blog_dict(blog: Blog, like_count: int = 0, user_liked: bool = False, comment_count: int = 0) -> dict:
    return {
        "blog_id": str(blog.blog_id),
        "author_id": str(blog.author_id),
        "author": user_dict(blog.author) if blog.author else None,
        "title": blog.title,
        "slug": blog.slug,
        "content": blog.content,
        "cover_image_url": blog.cover_image_url,
        "tags": blog.tags or [],
        "status": blog.status,
        "views": blog.views,
        "like_count": like_count,
        "user_liked": user_liked,
        "comment_count": comment_count,
        "created_at": blog.created_at.isoformat() + "Z" if blog.created_at else None,
        "updated_at": blog.updated_at.isoformat() + "Z" if blog.updated_at else None,
    }


async def get_blog_stats(db: AsyncSession, blog_id: uuid.UUID, user_id: Optional[uuid.UUID] = None):
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
    return like_count or 0, user_liked, comment_count or 0


# ─── File Upload ──────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload image or video for blog content. Stored in uploads/{username}/"""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Sanitize username for folder name
    username = re.sub(r"[^\w]", "_", f"{current_user.first_name}_{current_user.surname}").lower()
    user_dir = UPLOAD_BASE / username
    user_dir.mkdir(parents=True, exist_ok=True)

    # Unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = user_dir / unique_name

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Max 20 MB.",
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/{username}/{unique_name}"
    return {"url": file_url, "filename": unique_name}


# ─── Public Endpoints ─────────────────────────────────────────────────────────

@router.get("/")
async def list_blogs(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all published blogs, newest first."""
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

    like_count, _, comment_count = await get_blog_stats(db, blog.blog_id)
    return blog_dict(blog, like_count, False, comment_count)


# ─── Admin CRUD ───────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_blog(
    data: BlogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MEMBER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    base_slug = slugify(data.title)
    slug = base_slug
    # Ensure slug uniqueness
    counter = 1
    while await db.scalar(select(Blog).where(Blog.slug == slug)):
        slug = f"{base_slug}-{counter}"
        counter += 1

    blog = Blog(
        author_id=current_user.user_id,
        title=data.title,
        slug=slug,
        content=data.content,
        cover_image_url=data.cover_image_url,
        tags=data.tags,
        status=data.status,
    )
    db.add(blog)
    await db.commit()
    await db.refresh(blog)
    blog.author = current_user
    return blog_dict(blog)


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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Blog).where(Blog.blog_id == blog_id))
    blog = result.scalar_one_or_none()
    if not blog or blog.status != BlogStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Blog not found")

    existing = await db.scalar(
        select(BlogLike).where(
            BlogLike.blog_id == blog_id, BlogLike.user_id == current_user.user_id
        )
    )
    if existing:
        await db.delete(existing)
        liked = False
    else:
        like = BlogLike(blog_id=blog_id, user_id=current_user.user_id)
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
    current_user: User = Depends(get_current_user),
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

    comment = BlogComment(
        blog_id=blog_id,
        user_id=current_user.user_id,
        content=data.content.strip(),
        parent_id=data.parent_id,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
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
