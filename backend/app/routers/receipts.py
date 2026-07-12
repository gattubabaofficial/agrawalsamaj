"""Receipt listing and lookup endpoints. The actual PDF files are served via the
``/static/receipts`` mount; these endpoints expose metadata + the download URL."""
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, is_admin_level
from app.models.user import User
from app.models.receipt import Receipt, ReceiptType

router = APIRouter(prefix="/api/v1/receipts", tags=["Receipts"])


class ReceiptResponse(BaseModel):
    receipt_id: uuid.UUID
    receipt_number: str
    receipt_type: ReceiptType
    payer_name: str
    description: Optional[str]
    amount: float
    payment_mode: Optional[str]
    is_offline: bool
    issued_by_name: Optional[str]
    pdf_url: Optional[str]
    issued_at: datetime
    booking_id: Optional[uuid.UUID]
    registration_id: Optional[uuid.UUID]

    class Config:
        from_attributes = True
        use_enum_values = True


@router.get("/me", response_model=List[ReceiptResponse])
async def my_receipts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Receipt).where(Receipt.user_id == current_user.user_id).order_by(Receipt.issued_at.desc())
    )
    return result.scalars().all()


@router.get("", response_model=List[ReceiptResponse])
async def list_all_receipts(
    receipt_type: Optional[ReceiptType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    stmt = select(Receipt).order_by(Receipt.issued_at.desc())
    if receipt_type is not None:
        stmt = stmt.where(Receipt.receipt_type == receipt_type)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(
    receipt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Receipt).where(Receipt.receipt_id == receipt_id))
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.user_id != current_user.user_id and not is_admin_level(current_user):
        raise HTTPException(status_code=403, detail="Not authorized")
    return receipt
