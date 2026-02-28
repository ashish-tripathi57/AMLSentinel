from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Transaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a financial transaction on an account."""

    __tablename__ = "transactions"

    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=False)
    transaction_date: Mapped[str] = mapped_column(String(25), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # "credit" or "debit"
    channel: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "cash", "wire", "NEFT", etc.
    counterparty_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    counterparty_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    counterparty_bank: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)

    account = relationship("Account", back_populates="transactions")
