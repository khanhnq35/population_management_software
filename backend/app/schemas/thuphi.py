from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, computed_field

from .payment import PaymentOut

CollectionType = Literal[
    "bat_buoc_ca_nhan",
    "bat_buoc_theo_ho",
    "bat_buoc_theo_danh_sach",
    "tu_nguyen",
    "none",
]


class ThuPhiBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: Optional[str] = Field(default=None, max_length=255)
    amount: float | None = Field(default=None, ge=0)
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    collection_type: CollectionType = Field(default="none")
    target_codes: Optional[list[str]] = None


class ThuPhiCreate(ThuPhiBase):
    pass


class ThuPhiUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    collection_type: Optional[CollectionType] = None
    target_codes: Optional[list[str]] = None


class ThuPhiOut(ThuPhiBase):
    id: int
    created_at: datetime
    payments: list[PaymentOut] = Field(default_factory=list)

    class Config:
        from_attributes = True
    
    @computed_field
    @property
    def collected(self) -> float:
        """Calculate total collected amount from payments"""
        return sum(payment.amount_paid for payment in self.payments)
    
    @computed_field
    @property
    def remaining(self) -> float:
        """Calculate remaining amount to be paid"""
        amount_value = self.amount or 0
        return max(0, amount_value - self.collected)
