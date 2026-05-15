-- Example CRUD (DML) for the finance tracker schema.
-- Run against a database built from schema.sql (must include users row first).
-- Prefer creating a user via POST /api/auth/register or the UI; then use that user's id
-- in user_id columns below. Flask uses backend/instance/finance.db by default.

PRAGMA foreign_keys = ON;

-- Example user row (password_hash must be a real werkzeug/scrypt hash — use the app to register):
-- INSERT INTO users (email, password_hash, display_name, created_at)
-- VALUES ('you@example.com', '<hash>', 'You', datetime('now'));

-- =============================================================================
-- ACCOUNTS
-- =============================================================================
-- Create (user_id references users.id)
INSERT INTO accounts (user_id, name, account_type, currency, created_at)
VALUES (1, 'Vacation savings', 'savings', 'USD', datetime('now'));

-- Read
SELECT id, name, account_type, currency, created_at
FROM accounts
ORDER BY name;

-- Update
UPDATE accounts
SET name = 'Vacation fund', currency = 'USD'
WHERE id = 1;

-- Delete (cascades to transactions for that account if FK is CASCADE)
DELETE FROM accounts WHERE id = 99;

-- =============================================================================
-- CATEGORIES
-- =============================================================================
-- Create (user_id references users.id)
INSERT INTO categories (user_id, name, flow, color, created_at)
VALUES (1, 'Side gig', 'income', '#4ade80', datetime('now'));

-- Read
SELECT id, name, flow, color
FROM categories
WHERE flow = 'expense'
ORDER BY name;

-- Update
UPDATE categories
SET color = '#22c55e'
WHERE id = 1;

-- Delete (fails if referenced by transactions or budgets unless removed first)
DELETE FROM categories WHERE id = 99;

-- =============================================================================
-- TRANSACTIONS
-- =============================================================================
-- Create
INSERT INTO transactions (account_id, category_id, amount, note, occurred_on, created_at)
VALUES (1, 3, 42.50, 'Weekly shop', date('now'), datetime('now'));

-- Read
SELECT t.id, t.occurred_on, a.name AS account, c.name AS category, c.flow, t.amount, t.note
FROM transactions t
JOIN accounts a ON a.id = t.account_id
JOIN categories c ON c.id = t.category_id
WHERE t.occurred_on BETWEEN '2026-01-01' AND '2026-12-31'
ORDER BY t.occurred_on DESC, t.id DESC;

-- Update
UPDATE transactions
SET amount = 45.00, note = 'Weekly shop (adjusted)'
WHERE id = 1;

-- Delete
DELETE FROM transactions WHERE id = 99;

-- =============================================================================
-- BUDGETS
-- =============================================================================
-- Create (or replace via UNIQUE on category_id, year, month)
INSERT INTO budgets (category_id, year, month, limit_amount, created_at)
VALUES (4, 2026, 5, 500.00, datetime('now'));

-- Read
SELECT b.id, c.name AS category, b.year, b.month, b.limit_amount
FROM budgets b
JOIN categories c ON c.id = b.category_id
WHERE b.year = 2026 AND b.month = 5;

-- Update
UPDATE budgets
SET limit_amount = 550.00
WHERE id = 1;

-- Delete
DELETE FROM budgets WHERE id = 99;
