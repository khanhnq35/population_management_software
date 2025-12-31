from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class NhanKhauBase(BaseModel):
    citizen_code: str = Field(..., min_length=1, max_length=50)
    full_name: str = Field(..., min_length=3, max_length=128)
    date_of_birth: date
    gender: str = Field(..., pattern="^(Nam|Nu|Khac|nam|nu|khac)$")
    national_id: str = Field(..., min_length=1, max_length=20)
    household_id: int
    household_code: Optional[str] = Field(default=None, max_length=50)
    relationship_to_head: Literal["chu_ho", "bo", "me", "ong", "ba", "anh", "chi", "em", "chong", "vo", "con", "chau"] = "chu_ho"
    status: Optional[str] = Field(default="thuong_tru")
    birthplace: Optional[str] = Field(default=None, max_length=255)
    nationality: Optional[str] = Field(default="Việt Nam", max_length=100)
    ethnicity: Optional[str] = Field(default=None, max_length=100)
    occupation: Optional[str] = Field(default=None, max_length=128)
    temporary_address: Optional[str] = Field(default=None, max_length=255)


class NhanKhauCreate(NhanKhauBase):
    pass


class NhanKhauUpdate(BaseModel):
    citizen_code: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    national_id: Optional[str] = None
    household_id: Optional[int] = None
    household_code: Optional[str] = None
    relationship_to_head: Optional[Literal["chu_ho", "bo", "me", "ong", "ba", "anh", "chi", "em", "chong", "vo", "con", "chau"]] = None
    status: Optional[str] = None
    birthplace: Optional[str] = None
    nationality: Optional[str] = None
    ethnicity: Optional[str] = None
    occupation: Optional[str] = None
    temporary_address: Optional[str] = None


class NhanKhauOut(NhanKhauBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
