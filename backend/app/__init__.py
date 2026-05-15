import os

from flask import Flask
from flask_cors import CORS

from .models import db
from .routes import api_bp


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(app.instance_path, "finance.db"),
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-change-me")
    app.config["GOOGLE_CLIENT_ID"] = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    app.config["GOOGLE_CLIENT_SECRET"] = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    app.config["GOOGLE_OAUTH_REDIRECT_URI"] = os.environ.get(
        "GOOGLE_OAUTH_REDIRECT_URI",
        "http://localhost:5173/api/auth/google/callback",
    ).strip()
    app.config["FRONTEND_ORIGIN"] = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").strip()
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_PATH"] = "/"

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",
                "allow_headers": ["Content-Type", "Authorization"],
                "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            }
        },
    )

    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()

    return app
