import uuid
from typing import List, Optional
from sqlalchemy import String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class CustomRole(Base, TimestampMixin):
    __tablename__ = "custom_roles"

    role_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    permissions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Relationship back to users
    users: Mapped[List["User"]] = relationship("User", back_populates="custom_role")
