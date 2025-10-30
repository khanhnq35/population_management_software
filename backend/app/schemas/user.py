from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    full_name: str = Field(..., min_length=1, max_length=128)
    role: Literal["admin", "to_truong", "ke_toan"] = "to_truong"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[Literal["admin", "to_truong", "ke_toan"]] = None
    password: Optional[str] = Field(default=None, min_length=6)


class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
