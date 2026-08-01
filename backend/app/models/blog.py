import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Enum, Integer, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class BlogStatus(str, PyEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Blog(Base, TimestampMixin):
    __tablename__ = "blogs"

    blog_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(350), unique=True, index=True, nullable=False)
    # Markdown content stored here
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # List[str]
    status: Mapped[BlogStatus] = mapped_column(
        Enum(BlogStatus, name="blog_status"),
        default=BlogStatus.DRAFT,
        nullable=False,
    )
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Guest author info (filled when a non-logged-in user creates a blog)
    guest_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    guest_email: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    guest_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relationships
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])  # type: ignore[name-defined]
    comments: Mapped[List["BlogComment"]] = relationship(
        "BlogComment", back_populates="blog", cascade="all, delete-orphan"
    )
    likes: Mapped[List["BlogLike"]] = relationship(
        "BlogLike", back_populates="blog", cascade="all, delete-orphan"
    )


class BlogComment(Base, TimestampMixin):
    __tablename__ = "blog_comments"

    comment_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    blog_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("blogs.blog_id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True
    )
    guest_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # parent_id for 1-level nested replies
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("blog_comments.comment_id", ondelete="CASCADE"), nullable=True
    )

    # Relationships
    blog: Mapped[Blog] = relationship("Blog", back_populates="comments")
    author: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]
    replies: Mapped[List["BlogComment"]] = relationship(
        "BlogComment",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id],
    )
    parent: Mapped[Optional["BlogComment"]] = relationship(
        "BlogComment",
        back_populates="replies",
        remote_side="BlogComment.comment_id",
        foreign_keys=[parent_id],
    )


class BlogLike(Base):
    __tablename__ = "blog_likes"

    like_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    blog_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("blogs.blog_id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True
    )
    guest_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    blog: Mapped[Blog] = relationship("Blog", back_populates="likes")
    user: Mapped[Optional["User"]] = relationship("User")  # type: ignore[name-defined]


from sqlalchemy import LargeBinary

class UploadedFile(Base, TimestampMixin):
    __tablename__ = "uploaded_files"

    file_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    mimetype: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[LargeBinary] = mapped_column(LargeBinary, nullable=False)


