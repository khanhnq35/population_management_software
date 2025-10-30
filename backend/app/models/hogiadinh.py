from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class HoGiaDinh(Base):
    __tablename__ = "hogiadinh"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    household_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    head_of_household: Mapped[str] = mapped_column(String(128), nullable=False)
    established_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["NhanKhau"]] = relationship("NhanKhau", back_populates="household", cascade="all, delete")
