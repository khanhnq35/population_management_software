from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class ThuPhi(Base):
    __tablename__ = "thuphi"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    collection_type: Mapped[str] = mapped_column(String(50), nullable=False, default="none")
    target_codes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="fee", cascade="all, delete")
