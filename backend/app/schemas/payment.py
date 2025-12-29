from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PaymentBase(BaseModel):
    citizen_name: str = Field(..., min_length=3, max_length=128)
    household_code: Optional[str] = Field(default=None, max_length=50)
    amount_paid: float = Field(..., ge=0)
    citizen_id: Optional[int] = Field(default=None, ge=1)


class PaymentCreate(PaymentBase):
    household_code: str = Field(..., min_length=1, max_length=50)
    citizen_id: int = Field(..., ge=1)


class PaymentUpdate(BaseModel):
    citizen_name: Optional[str] = Field(default=None, min_length=3, max_length=128)
    household_code: Optional[str] = Field(default=None, max_length=50)
    amount_paid: Optional[float] = Field(default=None, ge=0)
    citizen_id: Optional[int] = Field(default=None, ge=1)


class PaymentOut(PaymentBase):
    id: int
    payment_date: datetime
    fee_id: int

    class Config:
        from_attributes = True
