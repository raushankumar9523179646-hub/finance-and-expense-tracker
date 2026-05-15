from datetime import date, datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=True, index=True)
    display_name = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_public_dict(self):
        resolved_name = (self.display_name or "").strip() or None
        return {
            "id": self.id,
            "email": self.email,
            "name": resolved_name,
            "display_name": self.display_name,
            "needs_profile_completion": resolved_name is None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Account(db.Model):
    __tablename__ = "accounts"

    __table_args__ = (
        CheckConstraint(
            "account_type IN ('checking','savings','cash','credit_card','investment','other')",
            name="ck_accounts_account_type",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    account_type = db.Column(db.String(40), nullable=False, default="checking")
    currency = db.Column(db.String(8), nullable=False, default="USD")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    transactions = db.relationship(
        "Transaction", backref="account", lazy="dynamic", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "account_type": self.account_type,
            "currency": self.currency,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Category(db.Model):
    __tablename__ = "categories"

    __table_args__ = (
        CheckConstraint("flow IN ('income','expense')", name="ck_categories_flow"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    flow = db.Column(db.String(20), nullable=False, default="expense")
    color = db.Column(db.String(16), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    transactions = db.relationship("Transaction", backref="category", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "flow": self.flow,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Transaction(db.Model):
    __tablename__ = "transactions"

    __table_args__ = (CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),)

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(
        db.Integer, db.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    note = db.Column(db.String(500), nullable=True)
    occurred_on = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "account_id": self.account_id,
            "category_id": self.category_id,
            "amount": float(self.amount) if self.amount is not None else None,
            "note": self.note,
            "occurred_on": self.occurred_on.isoformat() if self.occurred_on else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Budget(db.Model):
    __tablename__ = "budgets"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    limit_amount = db.Column(db.Numeric(14, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category = db.relationship("Category", backref=db.backref("budgets", lazy="dynamic"))

    __table_args__ = (
        db.UniqueConstraint("category_id", "year", "month", name="uq_budget_period"),
        CheckConstraint("month >= 1 AND month <= 12", name="ck_budgets_month"),
        CheckConstraint("year >= 1970 AND year <= 2100", name="ck_budgets_year"),
        CheckConstraint("limit_amount >= 0", name="ck_budgets_limit_nonnegative"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "year": self.year,
            "month": self.month,
            "limit_amount": float(self.limit_amount) if self.limit_amount is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
