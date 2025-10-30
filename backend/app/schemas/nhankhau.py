from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class NhanKhauBase(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=128)
    date_of_birth: date
    gender: str = Field(..., pattern="^(Nam|Nu|Khac|nam|nu|khac)$")
    national_id: Optional[str] = Field(default=None, max_length=20)
    household_id: Optional[int] = None
    status: Optional[str] = Field(default="thuong_tru")
    occupation: Optional[str] = Field(default=None, max_length=128)
    temporary_address: Optional[str] = Field(default=None, max_length=255)


class NhanKhauCreate(NhanKhauBase):
    pass


class NhanKhauUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    household_id: Optional[int] = None
    status: Optional[str] = None
    occupation: Optional[str] = None
    temporary_address: Optional[str] = None


class NhanKhauOut(NhanKhauBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
