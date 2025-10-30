from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base

STATUS_CHOICES = ("thuong_tru", "tam_tru", "tam_vang")


class NhanKhau(Base):
    __tablename__ = "nhankhau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    national_id: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    household_id: Mapped[int | None] = mapped_column(ForeignKey("hogiadinh.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(Enum(*STATUS_CHOICES, name="status_enum"), default="thuong_tru")
    occupation: Mapped[str | None] = mapped_column(String(128), nullable=True)
    temporary_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    household: Mapped["HoGiaDinh | None"] = relationship("HoGiaDinh", back_populates="members")
