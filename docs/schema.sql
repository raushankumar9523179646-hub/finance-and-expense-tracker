-- Personal finance tracker — reference schema (SQLite).
-- Flask + SQLAlchemy map to these tables. Auth: each user owns accounts & categories.
-- If migrating from an older DB without users, delete instance/finance.db and restart the app.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(256),
    google_sub VARCHAR(255) UNIQUE,
    display_name VARCHAR(120),
    created_at DATETIME
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    account_type VARCHAR(40) NOT NULL DEFAULT 'checking'
        CHECK (
            account_type IN (
                'checking',
                'savings',
                'cash',
                'credit_card',
                'investment',
                'other'
            )
        ),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    created_at DATETIME
);

CREATE INDEX IF NOT EXISTS ix_accounts_user ON accounts (user_id);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    flow VARCHAR(20) NOT NULL DEFAULT 'expense'
        CHECK (flow IN ('income', 'expense')),
    color VARCHAR(16),
    created_at DATETIME
);

CREATE INDEX IF NOT EXISTS ix_categories_user ON categories (user_id);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories (id),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    note VARCHAR(500),
    occurred_on DATE NOT NULL,
    created_at DATETIME
);

CREATE INDEX IF NOT EXISTS ix_transactions_occurred ON transactions (occurred_on);
CREATE INDEX IF NOT EXISTS ix_transactions_account ON transactions (account_id);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories (id),
    year INTEGER NOT NULL CHECK (year BETWEEN 1970 AND 2100),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    limit_amount NUMERIC(14, 2) NOT NULL CHECK (limit_amount >= 0),
    created_at DATETIME,
    CONSTRAINT uq_budget_period UNIQUE (category_id, year, month)
);

CREATE INDEX IF NOT EXISTS ix_budgets_period ON budgets (year, month);
