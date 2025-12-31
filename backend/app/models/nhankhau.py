from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base

STATUS_CHOICES = ("thuong_tru", "tam_tru", "tam_vang")
RELATIONSHIP_CHOICES = ("chu_ho", "bo", "me", "ong", "ba", "anh", "chi", "em", "chong", "vo", "con", "chau")


class NhanKhau(Base):
    __tablename__ = "nhankhau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    citizen_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)
    national_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    household_id: Mapped[int] = mapped_column(ForeignKey("hogiadinh.id", ondelete="CASCADE"), nullable=False, index=True)
    household_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    relationship_to_head: Mapped[str] = mapped_column(Enum(*RELATIONSHIP_CHOICES, name="relationship_enum"), default="chu_ho", nullable=False)
    status: Mapped[str] = mapped_column(Enum(*STATUS_CHOICES, name="status_enum"), default="thuong_tru")
    birthplace: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True, default="Việt Nam")
    ethnicity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(128), nullable=True)
    temporary_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    household: Mapped["HoGiaDinh"] = relationship("HoGiaDinh", back_populates="members")
