from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PaymentBase(BaseModel):
    citizen_name: str = Field(..., min_length=3, max_length=128)
    household_code: Optional[str] = Field(default=None, max_length=50)
    amount_paid: float = Field(..., ge=0)


class PaymentCreate(PaymentBase):
    pass


class PaymentOut(PaymentBase):
    id: int
    payment_date: datetime
    fee_id: int

    class Config:
        from_attributes = True
