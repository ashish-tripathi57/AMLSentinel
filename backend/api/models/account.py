from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Account(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a bank account belonging to a customer."""

    __tablename__ = "accounts"

    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id"), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opening_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    current_balance: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")

    customer = relationship("Customer", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", lazy="selectin")
