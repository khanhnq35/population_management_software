from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from pydantic import Field

from .nhankhau import NhanKhauOut


class HoGiaDinhBase(BaseModel):
    household_code: str = Field(..., min_length=3, max_length=50)
    address: str = Field(..., min_length=3, max_length=255)
    head_of_household: str = Field(..., min_length=3, max_length=128)
    established_date: Optional[date] = None


class HoGiaDinhCreate(HoGiaDinhBase):
    pass


class HoGiaDinhUpdate(BaseModel):
    address: Optional[str] = None
    head_of_household: Optional[str] = None
    established_date: Optional[date] = None


class HoGiaDinhOut(HoGiaDinhBase):
    id: int
    created_at: datetime
    members: list[NhanKhauOut] = Field(default_factory=list)

    class Config:
        from_attributes = True
