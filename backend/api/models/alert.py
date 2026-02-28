from sqlalchemy import Column, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

alert_transactions = Table(
    "alert_transactions",
    Base.metadata,
    Column("alert_id", String(36), ForeignKey("alerts.id"), primary_key=True),
    Column("transaction_id", String(36), ForeignKey("transactions.id"), primary_key=True),
)


class Alert(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents an AML alert flagged for investigation."""

    __tablename__ = "alerts"

    alert_id: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # e.g. "S1", "G2"
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id"), nullable=False)
    typology: Mapped[str] = mapped_column(String(100), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="New")
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    triggered_date: Mapped[str] = mapped_column(String(25), nullable=False)
    assigned_analyst: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(50), nullable=True)
    closed_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    total_flagged_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    flagged_transaction_count: Mapped[int] = mapped_column(Integer, default=0)

    customer = relationship("Customer", back_populates="alerts")
    flagged_transactions = relationship("Transaction", secondary=alert_transactions, lazy="selectin")
