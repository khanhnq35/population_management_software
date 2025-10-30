from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from .payment import PaymentOut


class ThuPhiBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: Optional[str] = Field(default=None, max_length=255)
    amount: float = Field(..., ge=0)
    due_date: Optional[date] = None


class ThuPhiCreate(ThuPhiBase):
    pass


class ThuPhiUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    due_date: Optional[date] = None


class ThuPhiOut(ThuPhiBase):
    id: int
    created_at: datetime
    payments: list[PaymentOut] = Field(default_factory=list)

    class Config:
        from_attributes = True
