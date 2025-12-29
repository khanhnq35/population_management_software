from __future__ import annotations

from datetime import datetime

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base

if TYPE_CHECKING:
    from .nhankhau import NhanKhau
    from .thuphi import ThuPhi


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    citizen_id: Mapped[int | None] = mapped_column(ForeignKey("nhankhau.id", ondelete="SET NULL"), nullable=True)
    citizen_name: Mapped[str] = mapped_column(String(128), nullable=False)
    household_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    fee_id: Mapped[int] = mapped_column(ForeignKey("thuphi.id", ondelete="CASCADE"), nullable=False)

    fee: Mapped["ThuPhi"] = relationship("ThuPhi", back_populates="payments")
    citizen: Mapped["NhanKhau | None"] = relationship("NhanKhau", passive_deletes=True)
