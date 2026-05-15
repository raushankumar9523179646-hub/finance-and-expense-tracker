from datetime import date, datetime
import secrets
import urllib.parse
from typing import Optional

from dateutil.relativedelta import relativedelta
from flask import Blueprint, current_app, g, jsonify, redirect, request, session
from sqlalchemy import case, func
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from .auth_utils import attach_user_or_error, create_token, hash_password, seed_new_user_defaults, verify_password
from .google_oauth import google_authorize_url, google_exchange_code, google_fetch_profile, google_oauth_ready
from .models import Account, Budget, Category, Transaction, User, db

api_bp = Blueprint("api", __name__)


@api_bp.before_request
def _require_auth_before_request():
    return attach_user_or_error()


ALLOWED_ACCOUNT_TYPES = frozenset(
    ("checking", "savings", "cash", "credit_card", "investment", "other")
)


def _parse_date(s, default=None):
    if not s:
        return default
    return datetime.strptime(s, "%Y-%m-%d").date()


def _uid():
    return g.current_user.id


def _require_account_owned(aid) -> Optional[Account]:
    return Account.query.filter_by(id=aid, user_id=_uid()).first()


def _require_category_owned(cid) -> Optional[Category]:
    return Category.query.filter_by(id=cid, user_id=_uid()).first()


def _transaction_owned_row(tid: int):
    row = Transaction.query.get(tid)
    if not row:
        return None
    if not _require_account_owned(row.account_id):
        return None
    if not _require_category_owned(row.category_id):
        return None
    return row


def _budget_owned_row(bid: int):
    b = Budget.query.get(bid)
    if not b or not _require_category_owned(b.category_id):
        return None
    return b


# --- Auth ---


@api_bp.route("/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(force=True, silent=True) or {}
    raw_email = data.get("email") or ""
    email = raw_email.strip().lower()
    password = data.get("password") or ""
    display_name = (data.get("name") or data.get("display_name") or "").strip() or None
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 400
    user = User(email=email, password_hash=hash_password(password), display_name=display_name)
    try:
        db.session.add(user)
        db.session.flush()
        seed_new_user_defaults(user.id)
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        current_app.logger.exception("register OperationalError — often old SQLite schema")
        msg = (
            "Database mismatch: delete backend/instance/finance.db (stop the API first), then restart Flask "
            "so tables are recreated."
        )
        return jsonify({"error": msg}), 500
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("register failed")
        return jsonify({"error": "could not save account"}), 500
    token = create_token(current_app._get_current_object(), user.id)
    return jsonify({"token": token, "user": user.to_public_dict()}), 201


@api_bp.route("/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "invalid email or password"}), 401
    if not user.password_hash:
        return jsonify({"error": "This account uses Google sign-in"}), 401
    if not verify_password(user.password_hash, password):
        return jsonify({"error": "invalid email or password"}), 401
    token = create_token(current_app._get_current_object(), user.id)
    return jsonify({"token": token, "user": user.to_public_dict()})


@api_bp.route("/auth/me", methods=["GET"])
def auth_me():
    return jsonify(g.current_user.to_public_dict())


@api_bp.route("/auth/profile", methods=["PATCH"])
def auth_update_profile():
    data = request.get_json(force=True, silent=True) or {}
    display_name = (data.get("name") or data.get("display_name") or "").strip()
    if not display_name:
        return jsonify({"error": "name is required"}), 400
    g.current_user.display_name = display_name
    db.session.commit()
    return jsonify(g.current_user.to_public_dict())


@api_bp.route("/auth/google/enabled", methods=["GET"])
def auth_google_enabled():
    return jsonify({"enabled": google_oauth_ready(current_app.config)})


@api_bp.route("/auth/google/start", methods=["GET"])
def auth_google_start():
    cfg = current_app.config
    if not google_oauth_ready(cfg):
        return jsonify({"error": "Google OAuth is not configured on the server"}), 503
    state = secrets.token_urlsafe(32)
    session["google_oauth_state"] = state
    url = google_authorize_url(cfg["GOOGLE_CLIENT_ID"], cfg["GOOGLE_OAUTH_REDIRECT_URI"], state)
    return redirect(url)


@api_bp.route("/auth/google/callback", methods=["GET"])
def auth_google_callback():
    cfg = current_app.config
    front = cfg["FRONTEND_ORIGIN"].rstrip("/")

    def fail(msg: str):
        q = urllib.parse.quote(msg[:400])
        return redirect(f"{front}/auth/google/done?error={q}")

    if not google_oauth_ready(cfg):
        return fail("Google OAuth is not configured")

    if request.args.get("error"):
        desc = request.args.get("error_description") or request.args.get("error")
        return fail(desc)

    code = request.args.get("code")
    state = request.args.get("state")
    stored = session.pop("google_oauth_state", None)
    if not code or not state or stored != state:
        return fail("Invalid sign-in session — try again")

    tok_json = google_exchange_code(
        cfg["GOOGLE_CLIENT_ID"],
        cfg["GOOGLE_CLIENT_SECRET"],
        cfg["GOOGLE_OAUTH_REDIRECT_URI"],
        code,
    )
    access = tok_json.get("access_token")
    if not access:
        current_app.logger.warning("Google token exchange failed: %s", tok_json)
        err = tok_json.get("error_description") or tok_json.get("error") or "Google sign-in failed"
        return fail(str(err))

    profile = google_fetch_profile(access)
    sub = profile.get("sub")
    email = (profile.get("email") or "").strip().lower()
    display_name = (profile.get("name") or "").strip() or None
    if not sub or not email:
        return fail("Google did not return your email (grant email permission to continue).")

    user = User.query.filter_by(google_sub=sub).first()
    if user:
        pass
    else:
        existing = User.query.filter_by(email=email).first()
        if existing:
            if existing.google_sub and existing.google_sub != sub:
                return fail("This email is already linked to another Google account.")
            existing.google_sub = sub
            if display_name and not existing.display_name:
                existing.display_name = display_name
            db.session.commit()
            user = existing
        else:
            user = User(email=email, display_name=display_name, google_sub=sub, password_hash=None)
            try:
                db.session.add(user)
                db.session.flush()
                seed_new_user_defaults(user.id)
                db.session.commit()
            except OperationalError:
                db.session.rollback()
                current_app.logger.exception("Google signup OperationalError")
                return fail(
                    "Database mismatch: delete backend/instance/finance.db then restart the API."
                )
            except SQLAlchemyError:
                db.session.rollback()
                current_app.logger.exception("Google signup failed")
                return fail("Could not create account")

    jwt_token = create_token(current_app._get_current_object(), user.id)
    safe_tok = urllib.parse.quote(jwt_token, safe="")
    needs_profile = not ((user.display_name or "").strip())
    if needs_profile:
        return redirect(f"{front}/auth/google/done?token={safe_tok}&needs_profile=1")
    return redirect(f"{front}/auth/google/done?token={safe_tok}")


# --- Accounts ---


@api_bp.route("/accounts", methods=["GET"])
def list_accounts():
    rows = Account.query.filter_by(user_id=_uid()).order_by(Account.name).all()
    return jsonify([a.to_dict() for a in rows])


@api_bp.route("/accounts", methods=["POST"])
def create_account():
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    atype = data.get("account_type") or "checking"
    if atype not in ALLOWED_ACCOUNT_TYPES:
        return jsonify({"error": f"account_type must be one of: {', '.join(sorted(ALLOWED_ACCOUNT_TYPES))}"}), 400
    acc = Account(
        user_id=_uid(),
        name=name,
        account_type=atype,
        currency=data.get("currency") or "USD",
    )
    db.session.add(acc)
    db.session.commit()
    return jsonify(acc.to_dict()), 201


@api_bp.route("/accounts/<int:aid>", methods=["PATCH"])
def update_account(aid):
    acc = _require_account_owned(aid)
    if not acc:
        return jsonify({"error": "account not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    if "name" in data and data["name"]:
        acc.name = data["name"].strip()
    if "account_type" in data:
        atype = data["account_type"]
        if atype not in ALLOWED_ACCOUNT_TYPES:
            return jsonify({"error": f"account_type must be one of: {', '.join(sorted(ALLOWED_ACCOUNT_TYPES))}"}), 400
        acc.account_type = atype
    if "currency" in data:
        acc.currency = data["currency"]
    db.session.commit()
    return jsonify(acc.to_dict())


@api_bp.route("/accounts/<int:aid>", methods=["DELETE"])
def delete_account(aid):
    acc = _require_account_owned(aid)
    if not acc:
        return jsonify({"error": "account not found"}), 404
    db.session.delete(acc)
    db.session.commit()
    return "", 204


# --- Categories ---


@api_bp.route("/categories", methods=["GET"])
def list_categories():
    flow = request.args.get("flow")
    q = Category.query.filter_by(user_id=_uid())
    if flow in ("income", "expense"):
        q = q.filter(Category.flow == flow)
    rows = q.order_by(Category.name).all()
    return jsonify([c.to_dict() for c in rows])


@api_bp.route("/categories", methods=["POST"])
def create_category():
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    flow = data.get("flow") or "expense"
    if flow not in ("income", "expense"):
        return jsonify({"error": "flow must be income or expense"}), 400
    cat = Category(name=name, flow=flow, color=data.get("color"), user_id=_uid())
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@api_bp.route("/categories/<int:cid>", methods=["PATCH"])
def update_category(cid):
    cat = _require_category_owned(cid)
    if not cat:
        return jsonify({"error": "category not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    if "name" in data and data["name"]:
        cat.name = data["name"].strip()
    if "flow" in data:
        if data["flow"] not in ("income", "expense"):
            return jsonify({"error": "flow must be income or expense"}), 400
        cat.flow = data["flow"]
    if "color" in data:
        cat.color = data["color"]
    db.session.commit()
    return jsonify(cat.to_dict())


@api_bp.route("/categories/<int:cid>", methods=["DELETE"])
def delete_category(cid):
    cat = _require_category_owned(cid)
    if not cat:
        return jsonify({"error": "category not found"}), 404
    db.session.delete(cat)
    db.session.commit()
    return "", 204


# --- Transactions ---


@api_bp.route("/transactions", methods=["GET"])
def list_transactions():
    uid = _uid()
    q = Transaction.query.join(Account, Transaction.account_id == Account.id).join(
        Category, Transaction.category_id == Category.id
    ).filter(Account.user_id == uid, Category.user_id == uid)

    if request.args.get("account_id"):
        q = q.filter(Transaction.account_id == int(request.args["account_id"]))
    if request.args.get("category_id"):
        q = q.filter(Transaction.category_id == int(request.args["category_id"]))
    d_from = _parse_date(request.args.get("from"))
    d_to = _parse_date(request.args.get("to"))
    if d_from:
        q = q.filter(Transaction.occurred_on >= d_from)
    if d_to:
        q = q.filter(Transaction.occurred_on <= d_to)
    rows = q.order_by(Transaction.occurred_on.desc(), Transaction.id.desc()).limit(500).all()
    return jsonify([t.to_dict() for t in rows])


@api_bp.route("/transactions", methods=["POST"])
def create_transaction():
    data = request.get_json(force=True, silent=True) or {}
    try:
        account_id = int(data["account_id"])
        category_id = int(data["category_id"])
        amount = float(data["amount"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "account_id, category_id, and amount are required"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be positive"}), 400
    if not _require_account_owned(account_id):
        return jsonify({"error": "account not found"}), 400
    if not _require_category_owned(category_id):
        return jsonify({"error": "category not found"}), 400
    t = Transaction(
        account_id=account_id,
        category_id=category_id,
        amount=amount,
        note=(data.get("note") or "").strip() or None,
        occurred_on=_parse_date(data.get("occurred_on"), date.today()),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


@api_bp.route("/transactions/<int:tid>", methods=["PATCH"])
def update_transaction(tid):
    t = _transaction_owned_row(tid)
    if not t:
        return jsonify({"error": "transaction not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    if "account_id" in data:
        aid = int(data["account_id"])
        if not _require_account_owned(aid):
            return jsonify({"error": "account not found"}), 400
        t.account_id = aid
    if "category_id" in data:
        cid = int(data["category_id"])
        if not _require_category_owned(cid):
            return jsonify({"error": "category not found"}), 400
        t.category_id = cid
    if "amount" in data:
        amt = float(data["amount"])
        if amt <= 0:
            return jsonify({"error": "amount must be positive"}), 400
        t.amount = amt
    if "note" in data:
        t.note = (data.get("note") or "").strip() or None
    if "occurred_on" in data:
        t.occurred_on = _parse_date(data["occurred_on"], t.occurred_on)
    db.session.commit()
    return jsonify(t.to_dict())


@api_bp.route("/transactions/<int:tid>", methods=["DELETE"])
def delete_transaction(tid):
    t = _transaction_owned_row(tid)
    if not t:
        return jsonify({"error": "transaction not found"}), 404
    db.session.delete(t)
    db.session.commit()
    return "", 204


# --- Budgets ---


@api_bp.route("/budgets", methods=["GET"])
def list_budgets():
    y = request.args.get("year", type=int)
    m = request.args.get("month", type=int)
    uid = _uid()
    q = Budget.query.join(Category, Budget.category_id == Category.id).filter(Category.user_id == uid)
    if y is not None:
        q = q.filter(Budget.year == y)
    if m is not None:
        q = q.filter(Budget.month == m)
    rows = q.order_by(Budget.year.desc(), Budget.month.desc()).all()
    return jsonify([b.to_dict() for b in rows])


@api_bp.route("/budgets", methods=["POST"])
def create_budget():
    data = request.get_json(force=True, silent=True) or {}
    try:
        category_id = int(data["category_id"])
        year = int(data["year"])
        month = int(data["month"])
        limit_amount = float(data["limit_amount"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "category_id, year, month, limit_amount required"}), 400
    if not (1 <= month <= 12):
        return jsonify({"error": "month must be 1-12"}), 400
    if limit_amount < 0:
        return jsonify({"error": "limit_amount must be non-negative"}), 400
    cat = _require_category_owned(category_id)
    if not cat:
        return jsonify({"error": "category not found"}), 400
    if cat.flow != "expense":
        return jsonify({"error": "budgets apply to expense categories"}), 400
    existing = Budget.query.filter_by(category_id=category_id, year=year, month=month).first()
    if existing:
        existing.limit_amount = limit_amount
        db.session.commit()
        return jsonify(existing.to_dict())
    b = Budget(category_id=category_id, year=year, month=month, limit_amount=limit_amount)
    db.session.add(b)
    db.session.commit()
    return jsonify(b.to_dict()), 201


@api_bp.route("/budgets/<int:bid>", methods=["PATCH"])
def update_budget(bid):
    b = _budget_owned_row(bid)
    if not b:
        return jsonify({"error": "budget not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    if "limit_amount" in data:
        amt = float(data["limit_amount"])
        if amt < 0:
            return jsonify({"error": "limit_amount must be non-negative"}), 400
        b.limit_amount = amt
    db.session.commit()
    return jsonify(b.to_dict())


@api_bp.route("/budgets/<int:bid>", methods=["DELETE"])
def delete_budget(bid):
    b = _budget_owned_row(bid)
    if not b:
        return jsonify({"error": "budget not found"}), 404
    db.session.delete(b)
    db.session.commit()
    return "", 204


# --- Summary / analytics ---


@api_bp.route("/summary/month", methods=["GET"])
def summary_month():
    uid = _uid()
    y = request.args.get("year", type=int)
    m = request.args.get("month", type=int)
    if y is None or m is None:
        today = date.today()
        y, m = today.year, today.month
    start = date(y, m, 1)
    end = start + relativedelta(months=1) - relativedelta(days=1)

    q = (
        db.session.query(Category.id, Category.name, Category.flow, func.coalesce(func.sum(Transaction.amount), 0))
        .join(Transaction, Transaction.category_id == Category.id)
        .join(Account, Transaction.account_id == Account.id)
        .filter(
            Transaction.occurred_on >= start,
            Transaction.occurred_on <= end,
            Category.user_id == uid,
            Account.user_id == uid,
        )
        .group_by(Category.id)
    )
    by_cat = []
    income_total = 0.0
    expense_total = 0.0
    for cid, name, flow, total in q.all():
        val = float(total)
        by_cat.append({"category_id": cid, "name": name, "flow": flow, "total": val})
        if flow == "income":
            income_total += val
        else:
            expense_total += val

    return jsonify(
        {
            "year": y,
            "month": m,
            "period_start": start.isoformat(),
            "period_end": end.isoformat(),
            "income_total": income_total,
            "expense_total": expense_total,
            "net": income_total - expense_total,
            "by_category": sorted(by_cat, key=lambda x: -x["total"]),
        }
    )


@api_bp.route("/summary/account-balances", methods=["GET"])
def account_balances():
    uid = _uid()
    rows = (
        db.session.query(
            Account.id,
            Account.name,
            func.coalesce(
                func.sum(
                    case(
                        (Category.flow == "income", Transaction.amount),
                        else_=-Transaction.amount,
                    )
                ),
                0,
            ),
        )
        .join(Transaction, Transaction.account_id == Account.id)
        .join(Category, Category.id == Transaction.category_id)
        .filter(Account.user_id == uid, Category.user_id == uid)
        .group_by(Account.id)
        .all()
    )
    all_accounts = {
        a.id: {"account": a.to_dict(), "balance": 0.0} for a in Account.query.filter_by(user_id=uid).all()
    }
    for aid, _name, bal in rows:
        if aid in all_accounts:
            all_accounts[aid]["balance"] = float(bal)
    return jsonify(list(all_accounts.values()))
