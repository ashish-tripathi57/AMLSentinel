from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Customer(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a banking customer under AML monitoring."""

    __tablename__ = "customers"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[str] = mapped_column(String(10), nullable=True)
    nationality: Mapped[str] = mapped_column(String(100), nullable=True)
    occupation: Mapped[str] = mapped_column(String(255), nullable=True)
    employer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    declared_annual_income: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_category: Mapped[str] = mapped_column(String(20), default="Medium")
    customer_since: Mapped[str | None] = mapped_column(String(10), nullable=True)
    id_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pep_status: Mapped[bool] = mapped_column(default=False)
    previous_alert_count: Mapped[int] = mapped_column(Integer, default=0)
    kyc_verification_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    kyc_last_update_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    income_verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    accounts = relationship("Account", back_populates="customer", lazy="selectin")
    alerts = relationship("Alert", back_populates="customer", lazy="selectin")
