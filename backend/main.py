from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Query, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
import shutil
import uuid
import json
import os
import re
import sqlite3
import hashlib
import secrets
import urllib.parse
import urllib.request
import time
import smtplib
from email.message import EmailMessage

import numpy as np
from PIL import Image, ImageOps
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

# TensorFlow is imported lazily inside load_ai_assets() so auth/weather/docs endpoints
# can still run on lightweight environments before the first AI scan.

app = FastAPI(title="PhytoSentry AI API")

def allowed_cors_origins():
    raw = os.getenv("PHYTOSENTRY_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,https://phytosentry.vercel.app")
    return [x.strip() for x in raw.split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

ROOT = Path(__file__).parent
# For production hosting, keep generated data outside the code directory.
# Render persistent disk example: PHYTOSENTRY_DATA_DIR=/var/data
DATA_DIR = Path(os.getenv("PHYTOSENTRY_DATA_DIR", str(ROOT))).expanduser()
UPLOADS = Path(os.getenv("PHYTOSENTRY_UPLOAD_DIR", str(DATA_DIR / "uploads"))).expanduser()
REPORTS = Path(os.getenv("PHYTOSENTRY_REPORT_DIR", str(DATA_DIR / "reports"))).expanduser()
DB_PATH = Path(os.getenv("PHYTOSENTRY_DB_PATH", str(DATA_DIR / "phytosentry.db"))).expanduser()
MODEL_DIR = ROOT / "model"
MODEL_PATH = MODEL_DIR / "phytosentry_model_finetuned_best.keras"
CLASS_PATH = MODEL_DIR / "class_names.json"
BACKEND_ASSETS = ROOT / "assets"
LOGO_PATH = BACKEND_ASSETS / "phytosentry-logo-full.png"
LOGO_ICON_PATH = BACKEND_ASSETS / "phytosentry-icon.png"
IMG_SIZE = 224

DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
UPLOADS.mkdir(parents=True, exist_ok=True)
REPORTS.mkdir(parents=True, exist_ok=True)
SESSION_TTL_SECONDS = int(os.getenv("PHYTOSENTRY_SESSION_TTL_SECONDS", str(60 * 60 * 24 * 30)))
WEATHER_CACHE_SECONDS = int(os.getenv("PHYTOSENTRY_WEATHER_CACHE_SECONDS", "1800"))
CLEANUP_MAX_AGE_DAYS = int(os.getenv("PHYTOSENTRY_CLEANUP_MAX_AGE_DAYS", "14"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("PHYTOSENTRY_RATE_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("PHYTOSENTRY_RATE_MAX_REQUESTS", "120"))
LOGIN_FAIL_WINDOW_SECONDS = int(os.getenv("PHYTOSENTRY_LOGIN_FAIL_WINDOW_SECONDS", "900"))
LOGIN_FAIL_MAX_ATTEMPTS = int(os.getenv("PHYTOSENTRY_LOGIN_FAIL_MAX_ATTEMPTS", "8"))

_rate_bucket = {}
_login_failures = {}
_weather_cache = {}

users = {}
history = []
_model = None
_class_names = None


# ── Persistent SQLite database for real account login ───────────────────────
def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                verified INTEGER DEFAULT 0,
                email_verified INTEGER DEFAULT 0,
                phone_verified INTEGER DEFAULT 0,
                plan TEXT DEFAULT 'free',
                scans INTEGER DEFAULT 0,
                saved INTEGER DEFAULT 0,
                reset_token TEXT,
                verification_code TEXT,
                verification_channel TEXT,
                verification_expires_at INTEGER,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at INTEGER,
                revoked INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                plant TEXT,
                disease TEXT,
                confidence REAL,
                severity TEXT,
                severity_level TEXT,
                date TEXT,
                image TEXT,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS weather_cache (
                cache_key TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS expert_bookings (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                expert_name TEXT,
                crop TEXT,
                issue TEXT,
                preferred_time TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS email_outbox (
                id TEXT PRIMARY KEY,
                recipient TEXT NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                session_id TEXT,
                language TEXT DEFAULT 'en',
                page TEXT,
                user_message TEXT NOT NULL,
                bot_answer TEXT NOT NULL,
                intent TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        # Backward-compatible migrations for older SQLite files.
        for ddl in [
            "ALTER TABLE sessions ADD COLUMN expires_at INTEGER",
            "ALTER TABLE sessions ADD COLUMN revoked INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN verification_code TEXT",
            "ALTER TABLE users ADD COLUMN verification_channel TEXT",
            "ALTER TABLE users ADD COLUMN verification_expires_at INTEGER"
        ]:
            try:
                conn.execute(ddl)
            except sqlite3.OperationalError:
                pass

        # Older project builds created users.email as NOT NULL and phone as non-unique.
        # Rebuild the table once so new users can sign up with either email OR phone.
        info = conn.execute("PRAGMA table_info(users)").fetchall()
        email_col = next((c for c in info if c[1] == "email"), None)
        needs_user_rebuild = bool(email_col and email_col[3])
        if needs_user_rebuild:
            conn.execute("ALTER TABLE users RENAME TO users_old")
            conn.execute(
                """
                CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE,
                    phone TEXT UNIQUE,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    verified INTEGER DEFAULT 0,
                    email_verified INTEGER DEFAULT 0,
                    phone_verified INTEGER DEFAULT 0,
                    plan TEXT DEFAULT 'free',
                    scans INTEGER DEFAULT 0,
                    saved INTEGER DEFAULT 0,
                    reset_token TEXT,
                    verification_code TEXT,
                    verification_channel TEXT,
                    verification_expires_at INTEGER,
                    created_at TEXT NOT NULL
                )
                """
            )
            old_cols = {c[1] for c in conn.execute("PRAGMA table_info(users_old)").fetchall()}
            email_verified_expr = "COALESCE(email_verified, verified, 0)" if "email_verified" in old_cols else "COALESCE(verified, 0)"
            phone_verified_expr = "COALESCE(phone_verified, 0)" if "phone_verified" in old_cols else "0"
            conn.execute(
                f"""
                INSERT OR IGNORE INTO users
                (id, name, email, phone, password_hash, salt, verified, email_verified, phone_verified, plan, scans, saved, reset_token, created_at)
                SELECT id, name, NULLIF(email, ''), NULLIF(phone, ''), password_hash, salt,
                       CASE WHEN COALESCE(verified, 0)=1 OR {email_verified_expr}=1 OR {phone_verified_expr}=1 THEN 1 ELSE 0 END,
                       {email_verified_expr}, {phone_verified_expr}, plan, scans, saved, reset_token, created_at
                FROM users_old
                """
            )
            conn.execute("DROP TABLE users_old")
        conn.commit()


def hash_password(password: str, salt: str | None = None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return salt, digest.hex()


def normalize_email(value: str | None):
    email = (value or "").strip().lower()
    if not email:
        return ""
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    return email


def normalize_phone(value: str | None):
    raw = (value or "").strip()
    if not raw:
        return ""
    cleaned = re.sub(r"[\s\-().]", "", raw)
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if not re.fullmatch(r"\+?\d{7,15}", cleaned):
        raise HTTPException(status_code=400, detail="Please enter a valid phone number with country/operator code.")
    return cleaned


def normalize_identifier(value: str | None):
    raw = (value or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Email or phone number is required.")
    if "@" in raw:
        return "email", normalize_email(raw)
    return "phone", normalize_phone(raw)


def find_user_by_identifier(conn, identifier: str):
    channel, value = normalize_identifier(identifier)
    row = conn.execute(f"SELECT * FROM users WHERE {channel} = ?", (value,)).fetchone()
    return row, channel, value


def public_user(row):
    email_verified = bool(row["email_verified"] if "email_verified" in row.keys() else row["verified"])
    phone_verified = bool(row["phone_verified"] if "phone_verified" in row.keys() else False)
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"] or "",
        "phone": row["phone"] or "",
        "verified": bool(row["verified"] or email_verified or phone_verified),
        "email_verified": email_verified,
        "phone_verified": phone_verified,
        "created_at": row["created_at"],
        "plan": row["plan"] or "free",
        "scans": row["scans"] or 0,
        "saved": row["saved"] or 0,
    }


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + SESSION_TTL_SECONDS
    with db_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, 0)",
            (token, user_id, datetime.now().isoformat(timespec="seconds"), expires_at),
        )
        conn.commit()
    return token


def token_from_authorization(authorization: str | None):
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization.strip() or None


def user_from_token(token: str | None):
    if not token:
        return None
    with db_conn() as conn:
        row = conn.execute(
            """
            SELECT users.* FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ? AND COALESCE(sessions.revoked, 0) = 0
              AND (sessions.expires_at IS NULL OR sessions.expires_at > ?)
            """,
            (token, int(time.time())),
        ).fetchone()
    return row


def optional_user(authorization: str | None):
    return user_from_token(token_from_authorization(authorization))


def require_user(authorization: str | None):
    row = optional_user(authorization)
    if not row:
        raise HTTPException(status_code=401, detail="Login required or session expired.")
    return row


def revoke_token(token: str | None):
    if not token:
        return
    with db_conn() as conn:
        conn.execute("UPDATE sessions SET revoked = 1 WHERE token = ?", (token,))
        conn.commit()


def rate_limit_key(request: Request):
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def check_rate_limit(request: Request, scope: str = "global", limit: int | None = None, window: int | None = None):
    limit = limit or RATE_LIMIT_MAX_REQUESTS
    window = window or RATE_LIMIT_WINDOW_SECONDS
    key = f"{scope}:{rate_limit_key(request)}"
    now = time.time()
    events = [t for t in _rate_bucket.get(key, []) if now - t < window]
    if len(events) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    events.append(now)
    _rate_bucket[key] = events


def record_login_failure(email: str, request: Request):
    key = f"{email}:{rate_limit_key(request)}"
    now = time.time()
    events = [t for t in _login_failures.get(key, []) if now - t < LOGIN_FAIL_WINDOW_SECONDS]
    events.append(now)
    _login_failures[key] = events


def check_login_failures(email: str, request: Request):
    key = f"{email}:{rate_limit_key(request)}"
    now = time.time()
    events = [t for t in _login_failures.get(key, []) if now - t < LOGIN_FAIL_WINDOW_SECONDS]
    _login_failures[key] = events
    if len(events) >= LOGIN_FAIL_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many failed login attempts. Please wait and try again.")


def clear_login_failures(email: str, request: Request):
    _login_failures.pop(f"{email}:{rate_limit_key(request)}", None)


def send_email_or_outbox(recipient: str, subject: str, body: str):
    status = "queued"
    smtp_host = os.getenv("PHYTOSENTRY_SMTP_HOST")
    smtp_user = os.getenv("PHYTOSENTRY_SMTP_USER")
    smtp_pass = os.getenv("PHYTOSENTRY_SMTP_PASS")
    smtp_port = int(os.getenv("PHYTOSENTRY_SMTP_PORT", "587"))
    sender = os.getenv("PHYTOSENTRY_EMAIL_FROM", smtp_user or "noreply@phytosentry.local")
    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = EmailMessage()
            msg["From"] = sender
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.set_content(body)
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            status = "sent"
        except Exception:
            status = "queued"
    with db_conn() as conn:
        conn.execute(
            "INSERT INTO email_outbox (id, recipient, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), recipient, subject, body, status, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
    return status


def send_sms_or_outbox(phone: str, body: str):
    # Production SMS gateway can be connected by replacing this function with
    # Twilio/SSL Wireless/BulkSMSBD/etc. credentials. Until then, OTPs are queued
    # in the same outbox table for demo/admin review.
    status = "queued"
    with db_conn() as conn:
        conn.execute(
            "INSERT INTO email_outbox (id, recipient, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), phone, "PhytoSentry phone OTP", body, status, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
    return status


def send_verification_code(user_id: str, channel: str, value: str):
    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = int(time.time()) + int(os.getenv("PHYTOSENTRY_OTP_TTL_SECONDS", "600"))
    with db_conn() as conn:
        conn.execute(
            "UPDATE users SET verification_code = ?, verification_channel = ?, verification_expires_at = ? WHERE id = ?",
            (code, channel, expires_at, user_id),
        )
        conn.commit()
    if channel == "email":
        status = send_email_or_outbox(value, "PhytoSentry verification code", f"Your PhytoSentry verification code is: {code}\nThis code expires in 10 minutes.")
    else:
        status = send_sms_or_outbox(value, f"Your PhytoSentry OTP is {code}. It expires in 10 minutes.")
    response = {"message": f"Verification code {status} for {channel}.", "channel": channel, "status": status}
    if os.getenv("PHYTOSENTRY_DEV_OTP", "1") == "1":
        response["dev_code"] = code
    return response


def cleanup_old_files(max_age_days: int = CLEANUP_MAX_AGE_DAYS):
    cutoff = time.time() - (max_age_days * 86400)
    removed = 0
    for folder in (UPLOADS, REPORTS):
        for path in folder.glob("*"):
            if path.is_file() and path.stat().st_mtime < cutoff:
                try:
                    path.unlink()
                    removed += 1
                except Exception:
                    pass
    return removed


def read_class_names():
    if not CLASS_PATH.exists():
        raise FileNotFoundError(f"Class names not found: {CLASS_PATH}")
    with CLASS_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_scan_result(result: dict, user_id: str | None = None):
    if user_id:
        result["user_id"] = user_id
    severity_level = str(result.get("severity", "Low")).lower()
    with db_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO scan_history
            (id, user_id, plant, disease, confidence, severity, severity_level, date, image, data_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.get("id"), user_id or None, result.get("plant"), result.get("disease"),
                float(result.get("confidence", 0) or 0), result.get("severity"), severity_level,
                result.get("date"), result.get("image"), json.dumps(result, ensure_ascii=False),
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        if user_id:
            conn.execute("UPDATE users SET scans = scans + 1 WHERE id = ?", (user_id,))
        conn.commit()


def db_result_from_row(row):
    data = json.loads(row["data_json"])
    data.setdefault("severityLevel", data.get("severity", "Low").lower())
    return data


def find_scan_result(result_id: str):
    with db_conn() as conn:
        row = conn.execute("SELECT data_json FROM scan_history WHERE id = ?", (result_id,)).fetchone()
    if row:
        return json.loads(row["data_json"])
    return next((x for x in history if x["id"] == result_id), None)


init_db()


# ── Real weather API helpers (Open-Meteo, no key required) ───────────────────
WEATHER_CODE_LABELS = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
    55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 80: "Rain showers",
    81: "Moderate rain showers", 82: "Violent rain showers", 95: "Thunderstorm",
}


def risk_level(score: int):
    if score >= 75:
        return "High", "red"
    if score >= 45:
        return "Moderate", "orange"
    return "Low", "green"


def disease_risks(temp: float, humidity: float, rainfall: float, rain_probability: float):
    wet_score = min(40, rainfall * 6) + min(30, rain_probability * 0.30)
    late_blight_score = int((humidity >= 80) * 35 + (12 <= temp <= 25) * 25 + wet_score)
    mildew_score = int((humidity >= 65) * 28 + (18 <= temp <= 30) * 24 + max(0, 20 - rainfall * 2))
    bacterial_score = int((humidity >= 70) * 22 + (temp >= 26) * 28 + min(30, rainfall * 5))
    root_rot_score = int(min(55, rainfall * 8) + (humidity >= 80) * 22 + (temp >= 20) * 12)
    raw = [
        ("Late Blight", late_blight_score, "Potato, Tomato"),
        ("Powdery Mildew", mildew_score, "Grape, Squash"),
        ("Bacterial Spot", bacterial_score, "Pepper, Tomato"),
        ("Leaf Blight Risk", root_rot_score, "Corn, Grape"),
    ]
    risks = []
    for name, score, crops in raw:
        level, color = risk_level(score)
        risks.append({"disease": name, "risk": level, "score": min(100, max(0, score)), "crops": crops, "color": color})
    return risks


def open_meteo_forecast(latitude: float, longitude: float, location: str):
    params = urllib.parse.urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m",
        "hourly": "precipitation_probability,precipitation",
        "daily": "uv_index_max,precipitation_sum",
        "timezone": "auto",
        "forecast_days": 1,
    })
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    with urllib.request.urlopen(url, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    current = payload.get("current", {})
    daily = payload.get("daily", {})
    hourly = payload.get("hourly", {})
    temp = float(current.get("temperature_2m", 0) or 0)
    humidity = float(current.get("relative_humidity_2m", 0) or 0)
    rainfall = float(current.get("rain", current.get("precipitation", 0)) or 0)
    wind = float(current.get("wind_speed_10m", 0) or 0)
    code = int(current.get("weather_code", 0) or 0)
    uv_values = daily.get("uv_index_max") or [0]
    daily_rain = daily.get("precipitation_sum") or [rainfall]
    rain_probability_values = hourly.get("precipitation_probability") or [0]
    rain_probability = max([float(x or 0) for x in rain_probability_values[:24]] or [0])
    rainfall_total = float(daily_rain[0] or rainfall)

    return {
        "location": location,
        "source": "Open-Meteo",
        "current": {
            "temperature": round(temp, 1),
            "humidity": round(humidity),
            "wind_speed": round(wind, 1),
            "rainfall": round(rainfall_total, 1),
            "rain_probability": round(rain_probability),
            "uv_index": round(float(uv_values[0] or 0), 1),
            "weather": WEATHER_CODE_LABELS.get(code, "Weather update"),
            "time": current.get("time", datetime.now().isoformat(timespec="minutes")),
        },
        "risks": disease_risks(temp, humidity, rainfall_total, rain_probability),
    }

SCIENTIFIC_NAMES = {
    "Apple scab": "Venturia inaequalis",
    "Black rot": "Botryosphaeria obtusa / Guignardia bidwellii",
    "Cedar apple rust": "Gymnosporangium juniperi-virginianae",
    "Powdery mildew": "Erysiphales fungi",
    "Cercospora leaf spot Gray leaf spot": "Cercospora zeae-maydis",
    "Common rust": "Puccinia sorghi",
    "Northern Leaf Blight": "Exserohilum turcicum",
    "Esca (Black Measles)": "Phaeoacremonium spp. / Phaeomoniella chlamydospora",
    "Leaf blight (Isariopsis Leaf Spot)": "Pseudocercospora vitis",
    "Haunglongbing (Citrus greening)": "Candidatus Liberibacter spp.",
    "Bacterial spot": "Xanthomonas spp.",
    "Early blight": "Alternaria solani",
    "Late blight": "Phytophthora infestans",
    "Leaf Mold": "Passalora fulva",
    "Septoria leaf spot": "Septoria lycopersici",
    "Spider mites Two-spotted spider mite": "Tetranychus urticae",
    "Target Spot": "Corynespora cassiicola",
    "Tomato Yellow Leaf Curl Virus": "Begomovirus",
    "Tomato mosaic virus": "Tobamovirus",
    "Leaf scorch": "Diplocarpon earlianum",
}

PLANT_ORGAN = "Leaf"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SELECTED_CROP_CLASS_PREFIXES = {
    "apple": ["Apple___"],
    "cherry": ["Cherry_(including_sour)___"],
    "corn": ["Corn_(maize)___"],
    "grape": ["Grape___"],
    "orange": ["Orange___"],
    "potato": ["Potato___"],
    "squash": ["Squash___"],
    "strawberry": ["Strawberry___"],
    "tomato": ["Tomato___"],
    # The dataset contains bell pepper classes; the UI label stays Chili for farmer-friendly use.
    "chili": ["Pepper,_bell___"],
}



def load_ai_assets():
    global _model, _class_names
    if _class_names is None:
        _class_names = read_class_names()
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
        import tensorflow as tf
        _model = tf.keras.models.load_model(MODEL_PATH)
    return _model, _class_names


def crop_allowed_indices(class_names: list[str], selected_crop: str | None):
    prefixes = SELECTED_CROP_CLASS_PREFIXES.get((selected_crop or "").strip().lower(), [])
    if not prefixes:
        return list(range(len(class_names)))
    allowed = [i for i, name in enumerate(class_names) if any(name.startswith(prefix) for prefix in prefixes)]
    return allowed or list(range(len(class_names)))


def readable_class(raw_name: str):
    """Convert Kaggle class names into website-friendly plant/disease labels."""
    parts = raw_name.split("___", 1)
    plant = parts[0] if parts else "Plant"
    disease = parts[1] if len(parts) > 1 else raw_name

    plant = plant.replace("_", " ").replace("Corn (maize)", "Corn")
    disease = disease.replace("_", " ").strip()
    disease = re.sub(r"\s+", " ", disease)

    is_healthy = disease.lower() == "healthy"
    display = f"{plant} – {'Healthy Leaf' if is_healthy else disease}"
    scientific = "No pathogen detected" if is_healthy else SCIENTIFIC_NAMES.get(disease, "Plant pathogen / field confirmation recommended")
    return plant, disease, display, scientific, is_healthy


def severity_from_prediction(confidence: float, is_healthy: bool):
    if is_healthy:
        return "None"
    if confidence >= 85:
        return "High"
    if confidence >= 60:
        return "Moderate"
    return "Low"


def affected_area_from_prediction(confidence: float, is_healthy: bool):
    if is_healthy:
        return "0%"
    if confidence >= 90:
        return "35%"
    if confidence >= 75:
        return "25%"
    if confidence >= 55:
        return "18%"
    return "10%"


def stage_from_prediction(confidence: float, is_healthy: bool):
    if is_healthy:
        return "Healthy"
    if confidence >= 90:
        return "Developing"
    if confidence >= 70:
        return "Early to developing"
    return "Possible early stage"


def overview_text(plant: str, disease: str, is_healthy: bool):
    if is_healthy:
        return f"The uploaded {plant} leaf appears healthy. No visible disease pattern was detected by the AI model. Continue regular monitoring and preventive care."
    return f"The AI model detected {disease} on {plant}. Review the symptoms, severity, and treatment plan below. Field confirmation is recommended before applying chemical treatment."


def symptoms_for(disease: str, is_healthy: bool):
    if is_healthy:
        return [
            "Leaf color and surface pattern appear normal",
            "No strong disease-specific visual marks detected",
            "Continue checking for future spots, curling, or discoloration",
            "Maintain balanced watering and sunlight",
        ]
    d = disease.lower()
    if "blight" in d:
        return ["Brown or dark leaf lesions", "Yellowing around affected areas", "Spots may expand under humid conditions", "Older leaves may dry or fall early"]
    if "rust" in d:
        return ["Small rust-colored pustules on leaves", "Yellow flecks around infection sites", "Disease spreads faster in humid weather", "Severe cases reduce photosynthesis"]
    if "mildew" in d:
        return ["White or gray powdery fungal growth", "Leaf curling or distortion", "Reduced plant vigor", "Spread increases in warm humid conditions"]
    if "spot" in d or "scab" in d:
        return ["Circular or irregular spots on leaf surface", "Dark margins around lesions", "Yellowing near infected tissues", "Leaf quality and growth may decline"]
    if "virus" in d or "mosaic" in d:
        return ["Mosaic or mottled leaf pattern", "Leaf curling or deformation", "Stunted plant growth", "Infected plants may show uneven yellowing"]
    return ["Visible abnormal leaf pattern", "Discoloration or lesions on leaf", "Possible reduction in plant vigor", "Monitor nearby plants for spread"]


def treatments_for(disease: str, is_healthy: bool):
    if is_healthy:
        return [
            {"type": "Organic", "name": "Preventive Neem Spray", "dose": "Use mild neem spray only when pest pressure is visible. Avoid unnecessary spraying.", "effectiveness": 65},
            {"type": "Biological", "name": "Beneficial Microbes", "dose": "Apply compost or biofertilizer to maintain strong plant immunity.", "effectiveness": 70},
            {"type": "Chemical", "name": "No Chemical Needed", "dose": "No chemical treatment is recommended for a healthy leaf.", "effectiveness": 0},
        ]
    d = disease.lower()
    if "virus" in d or "mosaic" in d:
        return [
            {"type": "Organic", "name": "Vector Control", "dose": "Use yellow sticky traps and neem-based sprays to reduce whiteflies/aphids.", "effectiveness": 68},
            {"type": "Biological", "name": "Remove Infected Plants", "dose": "Remove severely infected plants and control insect vectors immediately.", "effectiveness": 76},
            {"type": "Chemical", "name": "Insect Vector Management", "dose": "Use recommended insecticides only under local agricultural expert guidance.", "effectiveness": 82},
        ]
    if "bacterial" in d:
        return [
            {"type": "Organic", "name": "Sanitation + Neem", "dose": "Remove infected leaves and use neem spray as a preventive support.", "effectiveness": 65},
            {"type": "Biological", "name": "Bacillus-based Bio-control", "dose": "Apply Bacillus subtilis products according to label instructions.", "effectiveness": 78},
            {"type": "Chemical", "name": "Copper-based Bactericide", "dose": "Use copper formulation only as directed by the product label.", "effectiveness": 85},
        ]
    return [
        {"type": "Organic", "name": "Neem Oil Spray", "dose": "Mix 5 ml neem oil in 1 liter water and spray every 7 days in early morning.", "effectiveness": 72},
        {"type": "Biological", "name": "Trichoderma / Bacillus Bio-control", "dose": "Apply recommended bio-control product to soil or foliage as label directs.", "effectiveness": 81},
        {"type": "Chemical", "name": "Copper / Mancozeb Fungicide", "dose": "Use approved fungicide as per local label instructions. Avoid overuse.", "effectiveness": 90},
    ]


def prevention_for(plant: str, is_healthy: bool):
    base = [
        "Inspect leaves regularly and remove infected plant parts early",
        "Keep proper plant spacing for airflow",
        "Water at the base in the morning; avoid wetting leaves at night",
        "Use clean tools and disease-free seeds/seedlings",
        "Rotate crops and remove crop residues after harvest",
    ]
    if is_healthy:
        return [
            "Continue regular monitoring even though the leaf appears healthy",
            "Maintain balanced watering and avoid waterlogging",
            "Keep good airflow around the plant",
            "Use preventive organic care only when needed",
            "Check nearby plants for early symptoms weekly",
        ]
    return base


def prepare_image(image_path: Path):
    img = Image.open(image_path).convert("RGB")
    img = ImageOps.exif_transpose(img)
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.asarray(img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    return arr


def crop_selection_matches_prediction(class_name: str, selected_crop: str | None):
    """Return whether the optional UI crop hint matches the model's actual top class.

    Important: the selected crop is only a hint for user guidance. It must not force
    or override the trained AI model output, otherwise every scan can become the
    default selected crop (previously Tomato).
    """
    crop_key = (selected_crop or "").strip().lower()
    if not crop_key or crop_key == "auto":
        return True
    prefixes = SELECTED_CROP_CLASS_PREFIXES.get(crop_key, [])
    return bool(prefixes) and any(class_name.startswith(prefix) for prefix in prefixes)


def ai_prediction(filename: str, image_path: Path, selected_crop: str | None = None):
    model, class_names = load_ai_assets()
    arr = prepare_image(image_path)
    preds = model.predict(arr, verbose=0)[0]

    # Use the trained model's real ranking across ALL classes.
    # selected_crop is kept only as a user hint/metadata, never as a hard filter.
    top_indices = np.argsort(preds)[::-1][:3]

    top3 = []
    for idx in top_indices:
        plant, disease, display, scientific, is_healthy = readable_class(class_names[int(idx)])
        top3.append({
            "disease": display,
            "scientific": scientific,
            "confidence": round(float(preds[int(idx)] * 100), 2),
        })

    best_idx = int(top_indices[0])
    raw_best_class = class_names[best_idx]
    plant, disease, display, scientific, is_healthy = readable_class(raw_best_class)
    confidence = round(float(preds[best_idx] * 100), 2)
    severity = severity_from_prediction(confidence, is_healthy)
    crop_hint = (selected_crop or "auto").strip().lower() or "auto"
    crop_match = crop_selection_matches_prediction(raw_best_class, crop_hint)

    result = {
        "id": str(uuid.uuid4()),
        "plant": plant,
        "organ": PLANT_ORGAN,
        "disease": display,
        "scientific": scientific,
        "confidence": confidence,
        "severity": severity,
        "affected_area": affected_area_from_prediction(confidence, is_healthy),
        "stage": stage_from_prediction(confidence, is_healthy),
        "date": datetime.now().strftime("%b %d, %Y %I:%M %p"),
        "image": filename,
        "selected_crop": crop_hint,
        "crop_filter_applied": False,
        "crop_match": crop_match,
        "crop_note": "Auto-detected from the trained model. Crop selector did not override prediction." if crop_hint == "auto" else ("Selected crop matches the AI prediction." if crop_match else "Selected crop was used as a hint only; AI predicted a different crop from the trained dataset."),
        "overview": overview_text(plant, disease, is_healthy),
        "top3": top3,
        "symptoms": symptoms_for(disease, is_healthy),
        "treatments": treatments_for(disease, is_healthy),
        "prevention": prevention_for(plant, is_healthy),
    }
    return result


def demo_prediction(filename="sample.jpg"):
    return {
        "id": str(uuid.uuid4()), "plant": "Tomato", "organ": "Leaf",
        "disease": "Tomato – Early Blight", "scientific": "Alternaria solani",
        "confidence": 93.6, "severity": "Moderate", "affected_area": "32%",
        "stage": "Developing", "date": datetime.now().strftime("%b %d, %Y %I:%M %p"),
        "image": filename,
        "overview": "Early blight is a fungal disease that commonly affects tomato leaves. It starts from older lower leaves and spreads quickly in warm and humid weather.",
        "top3": [
            {"disease":"Tomato – Early Blight","scientific":"Alternaria solani","confidence":93.6},
            {"disease":"Tomato – Septoria leaf spot","scientific":"Septoria lycopersici","confidence":4.1},
            {"disease":"Tomato – Healthy Leaf","scientific":"No pathogen detected","confidence":2.3},
        ],
        "symptoms": ["Brown circular spots with dark rings", "Yellowing around infected areas", "Lower leaves affected first", "Leaves may dry and fall early"],
        "treatments": [
            {"type":"Organic","name":"Neem Oil Spray","dose":"Mix 5 ml neem oil in 1 liter water and spray every 7 days.","effectiveness":72},
            {"type":"Biological","name":"Trichoderma Viride","dose":"Apply to soil to improve root health and reduce pathogen growth.","effectiveness":81},
            {"type":"Chemical","name":"Copper Oxychloride","dose":"Use as directed on the product label. Avoid overuse and follow safety guidelines.","effectiveness":90}
        ],
        "prevention": ["Remove and destroy infected leaves", "Ensure proper plant spacing for air circulation", "Water at the base in the morning", "Use disease-free seeds and resistant varieties", "Rotate crops regularly"]
    }


@app.get("/")
def root():
    return {"message": "PhytoSentry AI API is running", "model_loaded": _model is not None}


def storage_status():
    return {
        "data_dir": str(DATA_DIR),
        "uploads_dir": str(UPLOADS),
        "reports_dir": str(REPORTS),
        "db_path": str(DB_PATH),
        "data_dir_exists": DATA_DIR.exists(),
        "uploads_dir_exists": UPLOADS.exists(),
        "reports_dir_exists": REPORTS.exists(),
        "db_parent_writable": os.access(str(DB_PATH.parent), os.W_OK),
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "PhytoSentry AI API",
        "model_file": MODEL_PATH.exists(),
        "class_names_file": CLASS_PATH.exists(),
        "storage": storage_status(),
    }


@app.get("/api/deploy-check")
def deploy_check():
    origins = allowed_cors_origins()
    return {
        "status": "ok",
        "service": "PhytoSentry AI API",
        "frontend_url": os.getenv("PHYTOSENTRY_FRONTEND_URL", "not-set"),
        "cors_origins": origins,
        "cors_configured_for_production": any("vercel.app" in origin or origin.startswith("https://") for origin in origins),
        "model_file_exists": MODEL_PATH.exists(),
        "class_names_file_exists": CLASS_PATH.exists(),
        "storage": storage_status(),
        "smtp_configured": bool(os.getenv("PHYTOSENTRY_SMTP_HOST") and os.getenv("PHYTOSENTRY_SMTP_USER") and os.getenv("PHYTOSENTRY_SMTP_PASS")),
        "notes": [
            "Set PHYTOSENTRY_CORS_ORIGINS to your Vercel URL before public deploy.",
            "Use PHYTOSENTRY_DATA_DIR=/var/data with a Render persistent disk for SQLite/uploads/reports.",
            "Keep backend on Render/Railway/VPS, not Vercel Functions, because TensorFlow/model/uploads need persistent runtime.",
        ],
    }


@app.get("/api/model-info")
def model_info():
    class_names = read_class_names()
    return {
        "model": MODEL_PATH.name,
        "model_file_exists": MODEL_PATH.exists(),
        "classes": len(class_names),
        "input_size": IMG_SIZE,
        "accuracy": "98.21% validation accuracy",
        "class_names": class_names,
    }


@app.post("/api/signup")
def signup(request: Request, payload: dict = Body(...)):
    check_rate_limit(request, "signup", limit=12, window=3600)
    email = normalize_email(payload.get("email") or "") if (payload.get("email") or "").strip() else ""
    phone = normalize_phone(payload.get("phone") or "") if (payload.get("phone") or "").strip() else ""
    password = payload.get("password") or ""
    name = (payload.get("name") or "").strip()
    if not name or not password or not (email or phone):
        raise HTTPException(status_code=400, detail="Name, password, and either email or phone number are required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    salt, password_hash = hash_password(password)
    user_id = str(uuid.uuid4())
    created_at = datetime.now().strftime("%b %d, %Y %I:%M %p")
    try:
        with db_conn() as conn:
            if email and conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
                raise HTTPException(status_code=409, detail="An account with this email already exists.")
            if phone and conn.execute("SELECT id FROM users WHERE phone = ?", (phone,)).fetchone():
                raise HTTPException(status_code=409, detail="An account with this phone number already exists.")
            conn.execute(
                """
                INSERT INTO users
                (id, name, email, phone, password_hash, salt, verified, email_verified, phone_verified, plan, scans, saved, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 'free', 0, 0, ?)
                """,
                (user_id, name, email or None, phone or None, password_hash, salt, created_at),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email or phone already exists.")

    preferred_channel = "phone" if phone else "email"
    preferred_value = phone or email
    verification = send_verification_code(user_id, preferred_channel, preferred_value)
    return {
        "message": "Registration successful. You can sign in with either your email or phone. Verification code has been sent/queued.",
        "user": public_user(row),
        "token": create_session(row["id"]),
        "verification": verification,
    }


@app.post("/api/login")
def login(request: Request, payload: dict = Body(...)):
    check_rate_limit(request, "login", limit=30, window=900)
    identifier = (payload.get("identifier") or payload.get("email") or payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    channel, value = normalize_identifier(identifier)
    check_login_failures(value, request)
    with db_conn() as conn:
        row = conn.execute(f"SELECT * FROM users WHERE {channel} = ?", (value,)).fetchone()
    if not row:
        record_login_failure(value, request)
        raise HTTPException(status_code=401, detail="Invalid email/phone or password.")
    _, password_hash = hash_password(password, row["salt"])
    if not secrets.compare_digest(password_hash, row["password_hash"]):
        record_login_failure(value, request)
        raise HTTPException(status_code=401, detail="Invalid email/phone or password.")
    clear_login_failures(value, request)
    return {"message": "Login successful", "user": public_user(row), "token": create_session(row["id"])}


@app.get("/api/me")
def me(authorization: str | None = Header(None)):
    row = require_user(authorization)
    return {"user": public_user(row)}


@app.post("/api/logout")
def logout(authorization: str | None = Header(None)):
    revoke_token(token_from_authorization(authorization))
    return {"message": "Logged out successfully."}


@app.post("/api/send-verification")
def send_verification(request: Request, payload: dict = Body(...), authorization: str | None = Header(None)):
    check_rate_limit(request, "send_verification", limit=12, window=3600)
    user_row = optional_user(authorization)
    identifier = (payload.get("identifier") or payload.get("email") or payload.get("phone") or "").strip()
    with db_conn() as conn:
        if user_row and not identifier:
            channel = "phone" if user_row["phone"] else "email"
            value = user_row["phone"] or user_row["email"]
            row = user_row
        else:
            row, channel, value = find_user_by_identifier(conn, identifier)
        if not row:
            raise HTTPException(status_code=404, detail="No account found for this email/phone.")
    return send_verification_code(row["id"], channel, value)


@app.post("/api/verify-contact")
def verify_contact(payload: dict = Body(...), authorization: str | None = Header(None)):
    identifier = (payload.get("identifier") or payload.get("email") or payload.get("phone") or "").strip()
    code = (payload.get("code") or payload.get("token") or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Verification code is required.")
    with db_conn() as conn:
        user_row = optional_user(authorization)
        if user_row and not identifier:
            row = user_row
            channel = row["verification_channel"] or ("phone" if row["phone"] else "email")
        else:
            row, channel, _ = find_user_by_identifier(conn, identifier)
        if not row:
            raise HTTPException(status_code=404, detail="No account found for this email/phone.")
        if not row["verification_code"] or row["verification_code"] != code:
            raise HTTPException(status_code=400, detail="Invalid verification code.")
        if row["verification_expires_at"] and int(row["verification_expires_at"]) < int(time.time()):
            raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
        channel = row["verification_channel"] or channel
        email_verified = 1 if channel == "email" else int(row["email_verified"] or 0)
        phone_verified = 1 if channel == "phone" else int(row["phone_verified"] or 0)
        verified = 1 if email_verified or phone_verified else int(row["verified"] or 0)
        conn.execute(
            """UPDATE users
               SET verified = ?, email_verified = ?, phone_verified = ?,
                   verification_code = NULL, verification_channel = NULL, verification_expires_at = NULL
               WHERE id = ?""",
            (verified, email_verified, phone_verified, row["id"]),
        )
        conn.commit()
        fresh = conn.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
    return {"message": f"{channel.title()} verified successfully.", "verified": True, "user": public_user(fresh)}


@app.post("/api/forgot-password")
def forgot(request: Request, payload: dict = Body(...)):
    check_rate_limit(request, "forgot", limit=10, window=3600)
    identifier = (payload.get("identifier") or payload.get("email") or payload.get("phone") or "").strip()
    token = secrets.token_urlsafe(24)
    reset_channel = "email"
    reset_value = ""
    with db_conn() as conn:
        row, channel, value = find_user_by_identifier(conn, identifier)
        if row:
            conn.execute("UPDATE users SET reset_token = ? WHERE id = ?", (token, row["id"]))
            conn.commit()
            reset_channel = channel
            reset_value = value
            reset_url = f"{os.getenv('PHYTOSENTRY_FRONTEND_URL', 'http://localhost:5173')}?reset_token={token}&identifier={urllib.parse.quote(value)}"
            body = f"Use this token to reset your PhytoSentry password: {token}\n\nReset URL: {reset_url}"
            if channel == "email":
                send_email_or_outbox(value, "PhytoSentry password reset", body)
            else:
                send_sms_or_outbox(value, f"PhytoSentry password reset token: {token}")
    return {
        "message": "If this account exists, a password reset code has been sent/queued.",
        "channel": reset_channel,
        "to": reset_value if os.getenv("PHYTOSENTRY_DEV_OTP", "1") == "1" else None,
        "reset_token": token if os.getenv("PHYTOSENTRY_DEV_RESET_TOKEN", "1") == "1" else None,
    }


@app.post("/api/reset-password")
def reset_password(payload: dict = Body(...)):
    identifier = (payload.get("identifier") or payload.get("email") or payload.get("phone") or "").strip()
    token = payload.get("token") or ""
    new_password = payload.get("password") or ""
    if not identifier or not token or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Email/phone, reset token, and a 6+ character password are required.")
    with db_conn() as conn:
        row, _, _ = find_user_by_identifier(conn, identifier)
        if not row or row["reset_token"] != token:
            raise HTTPException(status_code=400, detail="Invalid reset token.")
        salt, password_hash = hash_password(new_password)
        conn.execute("UPDATE users SET password_hash = ?, salt = ?, reset_token = NULL WHERE id = ?", (password_hash, salt, row["id"]))
        conn.commit()
    return {"message": "Password reset successfully. You can sign in with email or phone."}


@app.post("/api/verify-email")
def verify_email_compat(payload: dict = Body(...)):
    # Backward-compatible alias for older frontend calls. Prefer /api/send-verification + /api/verify-contact.
    email = normalize_email(payload.get("email") or "")
    with db_conn() as conn:
        conn.execute("UPDATE users SET verified = 1, email_verified = 1 WHERE email = ?", (email,))
        conn.commit()
    return {"message": "Email verified successfully.", "verified": True}


@app.post("/api/analyze")
async def analyze(
    request: Request,
    file: UploadFile = File(...),
    selected_crop: str = Form(""),
    authorization: str | None = Header(None),
):
    check_rate_limit(request, "analyze", limit=25, window=3600)
    user_row = optional_user(authorization)
    user_id = user_row["id"] if user_row else None
    cleanup_old_files()
    ext = (Path(file.filename or "leaf.jpg").suffix or ".jpg").lower()
    if ext not in ALLOWED_EXTENSIONS or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP leaf image.")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large. Maximum upload size is 10MB.")
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    filename = f"{uuid.uuid4()}{ext}"
    image_path = UPLOADS / filename
    try:
        with Image.open(__import__("io").BytesIO(raw)) as img:
            img.verify()
        image_path.write_bytes(raw)
        result = ai_prediction(filename, image_path, selected_crop=selected_crop)
    except HTTPException:
        raise
    except Exception as exc:
        if image_path.exists():
            try:
                image_path.unlink()
            except Exception:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Real AI prediction failed. Make sure TensorFlow is installed and the model files exist. Error: {exc}"
        )

    history.insert(0, result)
    save_scan_result(result, user_id=user_id)
    return result


@app.get("/api/weather")
def weather(
    request: Request,
    lat: float = 23.8103,
    lon: float = 90.4125,
    location: str = "Dhaka, Bangladesh",
):
    check_rate_limit(request, "weather", limit=60, window=3600)
    cache_key = f"{round(lat, 3)}:{round(lon, 3)}:{location}"
    now = int(time.time())
    with db_conn() as conn:
        row = conn.execute("SELECT data_json, created_at FROM weather_cache WHERE cache_key = ?", (cache_key,)).fetchone()
    if row and now - int(row["created_at"]) < WEATHER_CACHE_SECONDS:
        data = json.loads(row["data_json"])
        data["cached"] = True
        return data
    try:
        data = open_meteo_forecast(lat, lon, location)
        data["cached"] = False
        with db_conn() as conn:
            conn.execute("INSERT OR REPLACE INTO weather_cache (cache_key, data_json, created_at) VALUES (?, ?, ?)", (cache_key, json.dumps(data, ensure_ascii=False), now))
            conn.commit()
        return data
    except Exception as exc:
        if row:
            data = json.loads(row["data_json"])
            data["cached"] = True
            data["warning"] = f"Live weather unavailable; showing last cached data. {exc}"
            return data
        raise HTTPException(status_code=502, detail=f"Real weather API request failed and no cache exists: {exc}")


@app.get("/api/history")
def get_history(limit: int = 30, authorization: str | None = Header(None)):
    user_row = optional_user(authorization)
    with db_conn() as conn:
        if user_row:
            rows = conn.execute(
                "SELECT data_json FROM scan_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_row["id"], limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT data_json FROM scan_history WHERE user_id IS NULL ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    results = [json.loads(row["data_json"]) for row in rows]
    for item in results:
        item.setdefault("severityLevel", str(item.get("severity", "Low")).lower())
    if results:
        return results
    return history[:limit]


@app.get("/api/uploads/{filename}")
def get_upload(filename: str):
    safe = Path(filename).name
    path = UPLOADS / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(path)


@app.post("/api/cleanup")
def cleanup_endpoint(authorization: str | None = Header(None)):
    # Authenticated maintenance endpoint for local/admin demo use.
    require_user(authorization)
    removed = cleanup_old_files()
    return {"message": "Cleanup completed", "removed_files": removed}


@app.post("/api/expert-booking")
def expert_booking(payload: dict = Body(...), authorization: str | None = Header(None)):
    user_row = require_user(authorization)
    booking_id = str(uuid.uuid4())
    with db_conn() as conn:
        conn.execute(
            """INSERT INTO expert_bookings
            (id, user_id, expert_name, crop, issue, preferred_time, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)""",
            (booking_id, user_row["id"], payload.get("expert_name", "Agriculture Expert"), payload.get("crop", ""), payload.get("issue", ""), payload.get("preferred_time", ""), datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
    return {"message": "Expert booking request saved", "booking_id": booking_id, "status": "pending"}


# ── 24/7 website support chatbot ──────────────────────────────────────────────
CHATBOT_FAQ = [
    {
        "intent": "scan_help",
        "keywords": ["scan", "leaf", "upload", "photo", "image", "camera", "স্ক্যান", "পাতা", "ছবি", "আপলোড", "ক্যামেরা"],
        "en": "To scan a leaf: open Scan Leaf, select the crop, upload or capture a clear leaf photo, then press Analyze Leaf. Use daylight, focus on the affected area, and avoid blurry photos.",
        "bn": "পাতা স্ক্যান করতে: Scan Leaf খুলুন, ফসল নির্বাচন করুন, পরিষ্কার পাতার ছবি আপলোড/ক্যাপচার করুন, তারপর Analyze Leaf চাপুন। দিনের আলো ব্যবহার করুন, আক্রান্ত অংশে ফোকাস করুন এবং ঝাপসা ছবি এড়িয়ে চলুন।",
        "quick": ["Report help", "Photo tips", "Treatment guide"],
    },
    {
        "intent": "report_help",
        "keywords": ["report", "pdf", "print", "download", "বাংলা রিপোর্ট", "রিপোর্ট", "পিডিএফ", "প্রিন্ট", "ডাউনলোড"],
        "en": "Open Treatment or History, then choose PDF EN/PDF BN or Print EN/Print BN. Bangla reports are available from the BN button.",
        "bn": "Treatment অথবা History পেজ খুলুন, তারপর PDF EN/PDF BN বা Print EN/Print BN নির্বাচন করুন। বাংলা রিপোর্টের জন্য BN বাটন ব্যবহার করুন।",
        "quick": ["Scan help", "Login help", "History"],
    },
    {
        "intent": "login_help",
        "keywords": ["login", "signup", "account", "password", "forgot", "reset", "signin", "লগইন", "সাইন", "অ্যাকাউন্ট", "পাসওয়ার্ড", "রিসেট"],
        "en": "Use Sign Up to create an account, then Sign In with your email and password. If you forget the password, use Forgot Password and reset it with the token sent/queued by the backend.",
        "bn": "অ্যাকাউন্ট তৈরি করতে Sign Up ব্যবহার করুন, তারপর ইমেইল ও পাসওয়ার্ড দিয়ে Sign In করুন। পাসওয়ার্ড ভুলে গেলে Forgot Password থেকে backend-এর পাঠানো/queued token দিয়ে reset করুন।",
        "quick": ["Create account", "Forgot password", "Scan history"],
    },
    {
        "intent": "weather_help",
        "keywords": ["weather", "risk", "rain", "humidity", "forecast", "আবহাওয়া", "ঝুঁকি", "বৃষ্টি", "আর্দ্রতা", "পূর্বাভাস"],
        "en": "The Weather page uses live Open-Meteo data when available and cached data as fallback. Disease risk is advisory, based on humidity, temperature, and rainfall.",
        "bn": "Weather পেজে সম্ভব হলে live Open-Meteo data ব্যবহার হয়, না হলে cached data দেখায়। রোগ ঝুঁকি humidity, temperature ও rainfall-এর উপর ভিত্তি করে advisory হিসেবে দেখানো হয়।",
        "quick": ["Use my location", "Disease risk", "Scan help"],
    },
    {
        "intent": "treatment_help",
        "keywords": ["treatment", "medicine", "spray", "organic", "chemical", "prevention", "চিকিৎসা", "ঔষধ", "স্প্রে", "জৈব", "রাসায়নিক", "প্রতিরোধ"],
        "en": "After a scan, open Treatment Recommendations to see symptoms, organic/biological/chemical options, prevention tips, and printable reports. Always follow local label guidance before chemical use.",
        "bn": "স্ক্যানের পর Treatment Recommendations খুললে লক্ষণ, জৈব/জীবাণুভিত্তিক/রাসায়নিক সমাধান, প্রতিরোধ টিপস এবং printable report পাবেন। রাসায়নিক ব্যবহারের আগে local label/কৃষি পরামর্শ মেনে চলুন।",
        "quick": ["Expert help", "PDF report", "Weather risk"],
    },
    {
        "intent": "expert_help",
        "keywords": ["expert", "advisor", "booking", "consult", "call", "help", "বিশেষজ্ঞ", "পরামর্শ", "বুকিং", "কল", "সহায়তা"],
        "en": "Use Expert Connect to contact an agricultural expert. For urgent crop damage, use the hotline shown in the website footer or Experts page.",
        "bn": "কৃষি বিশেষজ্ঞের সাহায্যের জন্য Expert Connect ব্যবহার করুন। জরুরি ফসল ক্ষতির ক্ষেত্রে footer অথবা Experts পেজে থাকা hotline ব্যবহার করুন।",
        "quick": ["Book expert", "Emergency help", "Treatment guide"],
    },
    {
        "intent": "payment_help",
        "keywords": ["payment", "premium", "subscription", "plan", "price", "পেমেন্ট", "প্রিমিয়াম", "সাবস্ক্রিপশন", "প্ল্যান", "মূল্য"],
        "en": "Payments shows Free and Premium plan details. Live gateway integration needs SSLCommerz/bKash/Stripe credentials, so current payment UI is demo/config-ready.",
        "bn": "Payments পেজে Free ও Premium plan দেখা যায়। Live gateway-এর জন্য SSLCommerz/bKash/Stripe credentials দরকার, তাই বর্তমান payment UI demo/config-ready।",
        "quick": ["Premium benefits", "Login help", "Support ticket"],
    },
    {
        "intent": "technical_help",
        "keywords": ["backend", "error", "failed", "server", "tensorflow", "api", "port", "সমস্যা", "এরর", "সার্ভার", "চলছে না"],
        "en": "For local run issues: start backend on port 8000, frontend on 5173, check VITE_API_URL, and ensure TensorFlow/model files are installed before scanning.",
        "bn": "Local run সমস্যা হলে: backend port 8000-এ চালান, frontend 5173-এ চালান, VITE_API_URL check করুন, এবং scan করার আগে TensorFlow/model files আছে কিনা নিশ্চিত করুন।",
        "quick": ["Backend setup", "Upload error", "Report error"],
    },
]

CHATBOT_FALLBACK = {
    "en": "I can help with PhytoSentry website usage: leaf scan, reports, login, weather risk, treatment guidance, payment FAQ, and expert support. Please ask about one of these topics.",
    "bn": "আমি PhytoSentry website ব্যবহার নিয়ে সাহায্য করতে পারি: পাতা স্ক্যান, রিপোর্ট, লগইন, আবহাওয়া ঝুঁকি, চিকিৎসা নির্দেশনা, পেমেন্ট FAQ ও বিশেষজ্ঞ সহায়তা। এই বিষয়গুলোর কোনোটি নিয়ে প্রশ্ন করুন।",
}


def detect_chatbot_answer(message: str, lang: str = "en"):
    lang = "bn" if str(lang).lower().startswith("bn") else "en"
    q = (message or "").strip().lower()
    best = None
    best_score = 0
    for item in CHATBOT_FAQ:
        score = 0
        for kw in item["keywords"]:
            if kw.lower() in q:
                score += 2 if len(kw) > 4 else 1
        if score > best_score:
            best_score = score
            best = item
    if not best:
        return {
            "intent": "fallback",
            "answer": CHATBOT_FALLBACK[lang],
            "quick_replies": ["How to scan?", "PDF report", "Login help", "Weather risk", "Expert help"] if lang == "en" else ["কিভাবে স্ক্যান করব?", "পিডিএফ রিপোর্ট", "লগইন সহায়তা", "আবহাওয়া ঝুঁকি", "বিশেষজ্ঞ সহায়তা"],
        }
    return {
        "intent": best["intent"],
        "answer": best[lang],
        "quick_replies": best.get("quick", []),
    }


@app.post("/api/chatbot")
def chatbot(request: Request, payload: dict = Body(...), authorization: str | None = Header(None)):
    check_rate_limit(request, "chatbot", limit=80, window=3600)
    message = (payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")
    if len(message) > 1000:
        raise HTTPException(status_code=413, detail="Message is too long. Please keep it under 1000 characters.")
    lang = payload.get("lang") or payload.get("language") or "en"
    page = str(payload.get("page") or "")[:80]
    session_id = str(payload.get("session_id") or "")[:120]
    user_row = optional_user(authorization)
    response = detect_chatbot_answer(message, lang)
    with db_conn() as conn:
        conn.execute(
            """INSERT INTO chatbot_messages
            (id, user_id, session_id, language, page, user_message, bot_answer, intent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                user_row["id"] if user_row else None,
                session_id,
                "bn" if str(lang).lower().startswith("bn") else "en",
                page,
                message,
                response["answer"],
                response["intent"],
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        conn.commit()
    return {"answer": response["answer"], "intent": response["intent"], "quick_replies": response["quick_replies"], "source": "PhytoSentry website support FAQ"}


@app.get("/api/chatbot/history")
def chatbot_history(limit: int = 30, authorization: str | None = Header(None)):
    user_row = require_user(authorization)
    limit = max(1, min(int(limit or 30), 100))
    with db_conn() as conn:
        rows = conn.execute(
            """SELECT language, page, user_message, bot_answer, intent, created_at
            FROM chatbot_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?""",
            (user_row["id"], limit),
        ).fetchall()
    return [dict(row) for row in rows]



# ── Bilingual PDF report helpers ──────────────────────────────────────────────
def pdf_fonts(lang: str):
    if lang != "bn":
        return "Helvetica", "Helvetica-Bold"
    candidates = [
        os.getenv("PHYTOSENTRY_BN_FONT", ""),
        "C:/Windows/Fonts/Nirmala.ttf",
        "C:/Windows/Fonts/vrinda.ttf",
        "C:/Windows/Fonts/kalpurush.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansBengali-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for font_path in candidates:
        if font_path and Path(font_path).exists():
            try:
                pdfmetrics.registerFont(TTFont("PhytoSentryBangla", font_path))
                return "PhytoSentryBangla", "PhytoSentryBangla"
            except Exception:
                continue
    return "Helvetica", "Helvetica-Bold"


def report_labels(lang: str):
    if lang == "bn":
        return {
            "title": "PhytoSentry উদ্ভিদ রোগ শনাক্তকরণ রিপোর্ট",
            "date": "তারিখ", "plant": "ফসল/উদ্ভিদ", "disease": "রোগ", "scientific": "বৈজ্ঞানিক নাম",
            "confidence": "আস্থার স্কোর", "severity": "তীব্রতা", "affected": "আক্রান্ত অংশ", "stage": "অবস্থা",
            "details": "রোগের বিস্তারিত", "symptoms": "লক্ষণ", "treatments": "চিকিৎসা পরামর্শ", "prevention": "প্রতিরোধমূলক পরামর্শ",
        }
    return {
        "title": "PhytoSentry Plant Disease Report",
        "date": "Date", "plant": "Plant", "disease": "Disease", "scientific": "Scientific Name",
        "confidence": "Confidence", "severity": "Severity", "affected": "Affected Area", "stage": "Stage",
        "details": "Disease Details", "symptoms": "Symptoms", "treatments": "Treatments", "prevention": "Prevention Tips",
    }


VALUE_BN = {
    "High": "উচ্চ", "Moderate": "মাঝারি", "Low": "কম", "None": "নেই",
    "Healthy": "সুস্থ", "Developing": "বিকাশমান", "Early to developing": "প্রাথমিক থেকে বিকাশমান", "Possible early stage": "সম্ভাব্য প্রাথমিক পর্যায়",
    "Organic": "জৈব", "Biological": "জীবাণুভিত্তিক", "Chemical": "রাসায়নিক",
}

REPORT_TEXT_BN = {
    "Early blight is a fungal disease that commonly affects tomato leaves. It starts from older lower leaves and spreads quickly in warm and humid weather.": "আর্লি ব্লাইট একটি ছত্রাকজনিত রোগ, যা টমেটোর পাতায় বেশি দেখা যায়। উষ্ণ ও আর্দ্র আবহাওয়ায় এটি দ্রুত ছড়াতে পারে।",
    "Brown circular spots with dark rings": "গাঢ় বৃত্তসহ বাদামি গোলাকার দাগ",
    "Yellowing around infected areas": "আক্রান্ত অংশের চারপাশে হলদে ভাব",
    "Lower leaves affected first": "প্রথমে নিচের পাতাগুলো আক্রান্ত হয়",
    "Leaves may dry and fall early": "পাতা শুকিয়ে আগেভাগে ঝরে যেতে পারে",
    "Remove and destroy infected leaves": "আক্রান্ত পাতা দ্রুত সরিয়ে ধ্বংস করুন",
    "Ensure proper plant spacing for air circulation": "বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন",
    "Water at the base in the morning": "সকালে গাছের গোড়ায় পানি দিন",
    "Use disease-free seeds and resistant varieties": "রোগমুক্ত বীজ ও সহনশীল জাত ব্যবহার করুন",
    "Rotate crops regularly": "নিয়মিত ফসল পর্যায়ক্রম/রোটেশন করুন",
    "Neem Oil Spray": "নিম তেল স্প্রে",
    "Trichoderma Viride": "ট্রাইকোডার্মা ভিরিডি",
    "Copper Oxychloride": "কপার অক্সিক্লোরাইড",
}


def translate_value(value: str, lang: str):
    return VALUE_BN.get(value, value) if lang == "bn" else value


def translate_report_text(value: str, lang: str):
    return REPORT_TEXT_BN.get(value, value) if lang == "bn" else value




# Strong Bangla report conversion: do not depend on exact English sentence matches.
PLANT_BN = {
    "Apple": "আপেল", "Blueberry": "ব্লুবেরি", "Cherry": "চেরি", "Corn": "ভুট্টা",
    "Grape": "আঙ্গুর", "Orange": "কমলা", "Peach": "পিচ", "Pepper, bell": "ক্যাপসিকাম",
    "Pepper bell": "ক্যাপসিকাম", "Potato": "আলু", "Raspberry": "রাস্পবেরি", "Soybean": "সয়াবিন",
    "Squash": "স্কোয়াশ", "Strawberry": "স্ট্রবেরি", "Tomato": "টমেটো", "Plant": "উদ্ভিদ",
}

DISEASE_BN = {
    "Healthy Leaf": "সুস্থ পাতা", "healthy": "সুস্থ", "Apple scab": "আপেল স্ক্যাব",
    "Black rot": "ব্ল্যাক রট", "Cedar apple rust": "সিডার আপেল রাস্ট", "Powdery mildew": "পাউডারি মিলডিউ",
    "Cercospora leaf spot Gray leaf spot": "সারকোস্পোরা/গ্রে লিফ স্পট", "Common rust": "কমন রাস্ট",
    "Northern Leaf Blight": "নর্দার্ন লিফ ব্লাইট", "Esca (Black Measles)": "এসকা/ব্ল্যাক মিজলস",
    "Leaf blight (Isariopsis Leaf Spot)": "লিফ ব্লাইট/আইসারিওপসিস লিফ স্পট",
    "Haunglongbing (Citrus greening)": "সাইট্রাস গ্রিনিং/হুয়াংলংবিং", "Bacterial spot": "ব্যাকটেরিয়াল স্পট",
    "Early blight": "আর্লি ব্লাইট", "Late blight": "লেট ব্লাইট", "Leaf Mold": "লিফ মোল্ড",
    "Septoria leaf spot": "সেপ্টোরিয়া লিফ স্পট", "Spider mites Two-spotted spider mite": "টু-স্পটেড স্পাইডার মাইট",
    "Target Spot": "টার্গেট স্পট", "Tomato Yellow Leaf Curl Virus": "টমেটো ইয়েলো লিফ কার্ল ভাইরাস",
    "Tomato mosaic virus": "টমেটো মোজাইক ভাইরাস", "Leaf scorch": "লিফ স্কর্চ",
    "Plant pathogen / field confirmation recommended": "উদ্ভিদ রোগজীবাণু / মাঠ পর্যায়ে নিশ্চিতকরণ প্রস্তাবিত",
    "No pathogen detected": "কোনো রোগজীবাণু শনাক্ত হয়নি",
}

TREATMENT_NAME_BN = {
    "Neem Oil Spray": "নিম তেল স্প্রে", "Preventive Neem Spray": "প্রতিরোধমূলক নিম স্প্রে",
    "Trichoderma Viride": "ট্রাইকোডার্মা ভিরিডি", "Trichoderma / Bacillus Bio-control": "ট্রাইকোডার্মা / ব্যাসিলাস বায়ো-কন্ট্রোল",
    "Copper Oxychloride": "কপার অক্সিক্লোরাইড", "Copper / Mancozeb Fungicide": "কপার / ম্যানকোজেব ছত্রাকনাশক",
    "Beneficial Microbes": "উপকারী অণুজীব", "No Chemical Needed": "রাসায়নিক প্রয়োজন নেই",
    "Vector Control": "বাহক পোকা নিয়ন্ত্রণ", "Remove Infected Plants": "আক্রান্ত গাছ অপসারণ",
    "Insect Vector Management": "বাহক পোকা ব্যবস্থাপনা", "Sanitation + Neem": "পরিচ্ছন্নতা + নিম",
    "Bacillus-based Bio-control": "ব্যাসিলাস-ভিত্তিক বায়ো-কন্ট্রোল", "Copper-based Bactericide": "কপার-ভিত্তিক ব্যাকটেরিয়ানাশক",
}

DOSE_BN = {
    "Mix 5 ml neem oil in 1 liter water and spray every 7 days in early morning.": "১ লিটার পানিতে ৫ মিলি নিম তেল মিশিয়ে ভোরে/সকালে প্রতি ৭ দিনে স্প্রে করুন।",
    "Mix 5 ml neem oil in 1 liter water and spray every 7 days.": "১ লিটার পানিতে ৫ মিলি নিম তেল মিশিয়ে প্রতি ৭ দিনে সকালে স্প্রে করুন।",
    "Mix 5ml neem oil in 1L water. Spray every 7 days in early morning.": "১ লিটার পানিতে ৫ মিলি নিম তেল মিশিয়ে ভোরে/সকালে প্রতি ৭ দিনে স্প্রে করুন।",
    "Apply recommended bio-control product to soil or foliage as label directs.": "লেবেল নির্দেশনা অনুযায়ী মাটি বা পাতায় অনুমোদিত বায়ো-কন্ট্রোল পণ্য প্রয়োগ করুন।",
    "Apply to soil around plant base to reduce pathogen growth.": "রোগজীবাণুর বৃদ্ধি কমাতে গাছের গোড়ার মাটিতে প্রয়োগ করুন।",
    "Use approved fungicide as per local label instructions. Avoid overuse.": "স্থানীয় লেবেল নির্দেশনা অনুযায়ী অনুমোদিত ছত্রাকনাশক ব্যবহার করুন। অতিরিক্ত ব্যবহার এড়িয়ে চলুন।",
    "Use 2g per liter of water. Apply every 10-14 days. Avoid overuse.": "প্রতি লিটার পানিতে ২ গ্রাম ব্যবহার করুন। ১০–১৪ দিন পরপর প্রয়োগ করুন এবং অতিরিক্ত ব্যবহার এড়িয়ে চলুন।",
    "Use mild neem spray only when pest pressure is visible. Avoid unnecessary spraying.": "শুধু পোকামাকড়ের চাপ দেখা গেলে হালকা নিম স্প্রে ব্যবহার করুন। অপ্রয়োজনীয় স্প্রে এড়িয়ে চলুন।",
    "Apply compost or biofertilizer to maintain strong plant immunity.": "গাছের রোগ প্রতিরোধ ক্ষমতা বজায় রাখতে কম্পোস্ট বা বায়োফার্টিলাইজার ব্যবহার করুন।",
    "No chemical treatment is recommended for a healthy leaf.": "সুস্থ পাতার জন্য কোনো রাসায়নিক চিকিৎসা সুপারিশ করা হয় না।",
    "Use yellow sticky traps and neem-based sprays to reduce whiteflies/aphids.": "সাদা মাছি/এফিড কমাতে হলুদ স্টিকি ট্র্যাপ ও নিম-ভিত্তিক স্প্রে ব্যবহার করুন।",
    "Remove severely infected plants and control insect vectors immediately.": "গুরুতর আক্রান্ত গাছ সরিয়ে ফেলুন এবং বাহক পোকা দ্রুত নিয়ন্ত্রণ করুন।",
    "Use recommended insecticides only under local agricultural expert guidance.": "শুধু স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শে অনুমোদিত কীটনাশক ব্যবহার করুন।",
    "Remove infected leaves and use neem spray as a preventive support.": "আক্রান্ত পাতা সরিয়ে ফেলুন এবং প্রতিরোধমূলক সহায়তা হিসেবে নিম স্প্রে ব্যবহার করুন।",
    "Apply Bacillus subtilis products according to label instructions.": "লেবেল নির্দেশনা অনুযায়ী Bacillus subtilis পণ্য প্রয়োগ করুন।",
    "Use copper formulation only as directed by the product label.": "পণ্যের লেবেল নির্দেশনা অনুযায়ী কপার ফর্মুলেশন ব্যবহার করুন।",
}

SYMPTOM_BN = {
    "Brown circular spots with dark concentric rings": "গাঢ় বৃত্তসহ বাদামি গোলাকার দাগ",
    "Yellowing (chlorosis) around infected areas": "আক্রান্ত অংশের চারপাশে হলদে ভাব",
    "Lower leaves affected first": "প্রথমে নিচের পাতাগুলো আক্রান্ত হয়",
    "Premature leaf drop": "পাতা আগেভাগে ঝরে পড়া",
    "Brown or dark leaf lesions": "পাতায় বাদামি বা কালচে ক্ষত/দাগ",
    "Yellowing around affected areas": "আক্রান্ত অংশের চারপাশে হলদে ভাব",
    "Spots may expand under humid conditions": "আর্দ্র পরিবেশে দাগ বড় হতে পারে",
    "Older leaves may dry or fall early": "পুরোনো পাতা শুকিয়ে আগেভাগে ঝরে যেতে পারে",
    "Small rust-colored pustules on leaves": "পাতায় মরিচা রঙের ছোট দানা/পুস্টিউল দেখা যায়",
    "Yellow flecks around infection sites": "সংক্রমিত স্থানের চারপাশে হলুদ দাগ দেখা যায়",
    "Disease spreads faster in humid weather": "আর্দ্র আবহাওয়ায় রোগ দ্রুত ছড়ায়",
    "Severe cases reduce photosynthesis": "গুরুতর অবস্থায় সালোকসংশ্লেষণ কমে যায়",
    "White or gray powdery fungal growth": "পাতায় সাদা বা ধূসর গুঁড়ার মতো ছত্রাক দেখা যায়",
    "Leaf curling or distortion": "পাতা কুঁকড়ে যায় বা বিকৃত হয়",
    "Reduced plant vigor": "গাছের স্বাভাবিক বৃদ্ধি ও শক্তি কমে যায়",
    "Spread increases in warm humid conditions": "উষ্ণ ও আর্দ্র পরিবেশে ছড়ানোর ঝুঁকি বাড়ে",
    "Circular or irregular spots on leaf surface": "পাতার উপর গোলাকার বা অনিয়মিত দাগ দেখা যায়",
    "Dark margins around lesions": "দাগের চারপাশে গাঢ় কিনারা দেখা যায়",
    "Yellowing near infected tissues": "আক্রান্ত টিস্যুর কাছে হলদে ভাব দেখা যায়",
    "Leaf quality and growth may decline": "পাতার মান ও বৃদ্ধি কমে যেতে পারে",
    "Mosaic or mottled leaf pattern": "পাতায় মোজাইক বা ছোপ ছোপ দাগ দেখা যায়",
    "Leaf curling or deformation": "পাতা কুঁকড়ে যায় বা বিকৃত হয়",
    "Stunted plant growth": "গাছের বৃদ্ধি বাধাগ্রস্ত হয়",
    "Infected plants may show uneven yellowing": "আক্রান্ত গাছে অসম হলদে ভাব দেখা যেতে পারে",
    "Visible abnormal leaf pattern": "পাতায় অস্বাভাবিক প্যাটার্ন দেখা যায়",
    "Discoloration or lesions on leaf": "পাতায় রঙ পরিবর্তন বা ক্ষত দেখা যায়",
    "Possible reduction in plant vigor": "গাছের স্বাভাবিক শক্তি কমে যেতে পারে",
    "Monitor nearby plants for spread": "রোগ ছড়াচ্ছে কি না দেখতে পাশের গাছগুলো পর্যবেক্ষণ করুন",
    "Leaf color and surface pattern appear normal": "পাতার রঙ ও পৃষ্ঠের প্যাটার্ন স্বাভাবিক দেখাচ্ছে",
    "No strong disease-specific visual marks detected": "রোগ-নির্দিষ্ট শক্তিশালী দৃশ্যমান লক্ষণ পাওয়া যায়নি",
    "Continue checking for future spots, curling, or discoloration": "ভবিষ্যতে দাগ, কুঁকড়ে যাওয়া বা রঙ পরিবর্তন হচ্ছে কি না নিয়মিত দেখুন",
    "Maintain balanced watering and sunlight": "সুষম পানি ও পর্যাপ্ত আলো বজায় রাখুন",
}

PREVENTION_BN = {
    "Inspect leaves regularly and remove infected plant parts early": "নিয়মিত পাতা পরীক্ষা করুন এবং আক্রান্ত অংশ দ্রুত সরিয়ে ফেলুন",
    "Keep proper plant spacing for airflow": "বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন",
    "Water at the base in the morning; avoid wetting leaves at night": "সকালে গাছের গোড়ায় পানি দিন; রাতে পাতা ভেজানো এড়িয়ে চলুন",
    "Use clean tools and disease-free seeds/seedlings": "পরিষ্কার যন্ত্রপাতি ও রোগমুক্ত বীজ/চারা ব্যবহার করুন",
    "Rotate crops and remove crop residues after harvest": "ফসল রোটেশন করুন এবং ফসল কাটার পর অবশিষ্টাংশ সরিয়ে ফেলুন",
    "Remove and destroy infected leaves immediately": "আক্রান্ত পাতা দ্রুত সরিয়ে ধ্বংস করুন",
    "Ensure proper spacing for air circulation": "বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন",
    "Water at plant base in the morning only": "শুধু সকালে গাছের গোড়ায় পানি দিন",
    "Use certified disease-free seeds": "সনদপ্রাপ্ত রোগমুক্ত বীজ ব্যবহার করুন",
    "Rotate crops every season": "প্রতি মৌসুমে ফসল রোটেশন করুন",
    "Continue regular monitoring even though the leaf appears healthy": "পাতা সুস্থ দেখালেও নিয়মিত পর্যবেক্ষণ চালিয়ে যান",
    "Maintain balanced watering and avoid waterlogging": "সুষম পানি দিন এবং জলাবদ্ধতা এড়িয়ে চলুন",
    "Keep good airflow around the plant": "গাছের চারপাশে ভালো বাতাস চলাচল রাখুন",
    "Use preventive organic care only when needed": "প্রয়োজন হলে তবেই প্রতিরোধমূলক জৈব যত্ন নিন",
    "Check nearby plants for early symptoms weekly": "প্রতি সপ্তাহে পাশের গাছে প্রাথমিক লক্ষণ আছে কি না দেখুন",
}


def _lookup_bn(mapping: dict, value: str):
    value = str(value or "")
    if value in mapping:
        return mapping[value]
    value_lower = value.lower().strip()
    for key, translated in mapping.items():
        if str(key).lower().strip() == value_lower:
            return translated
    return None


def _contains_latin(text: str) -> bool:
    return bool(re.search(r"[A-Za-z]", str(text or "")))


def bn_plant(value: str) -> str:
    value = str(value or "Plant")
    return _lookup_bn(PLANT_BN, value) or value


def bn_disease(value: str) -> str:
    value = str(value or "")
    normalized = value.replace("—", "–")
    if "–" in normalized:
        left, right = [x.strip() for x in normalized.split("–", 1)]
        return f"{bn_plant(left)} – {_lookup_bn(DISEASE_BN, right) or right}"
    return _lookup_bn(DISEASE_BN, normalized) or normalized


def bn_scientific(value: str) -> str:
    # Scientific names are intentionally kept in Latin where applicable.
    return _lookup_bn(DISEASE_BN, value) or str(value or "")


def bn_symptoms_for_disease(disease: str, is_healthy: bool = False):
    d = str(disease or "").lower()
    if is_healthy or "healthy" in d or "সুস্থ" in d:
        return [
            "পাতার রঙ ও পৃষ্ঠের প্যাটার্ন স্বাভাবিক দেখাচ্ছে",
            "রোগ-নির্দিষ্ট শক্তিশালী দৃশ্যমান লক্ষণ পাওয়া যায়নি",
            "ভবিষ্যতে দাগ, কুঁকড়ে যাওয়া বা রঙ পরিবর্তন হচ্ছে কি না নিয়মিত দেখুন",
            "সুষম পানি ও পর্যাপ্ত আলো বজায় রাখুন",
        ]
    if "virus" in d or "mosaic" in d or "curl" in d:
        return ["পাতায় মোজাইক বা ছোপ ছোপ দাগ দেখা যায়", "পাতা কুঁকড়ে যায় বা বিকৃত হয়", "গাছের বৃদ্ধি বাধাগ্রস্ত হতে পারে", "আক্রান্ত গাছে অসম হলদে ভাব দেখা যেতে পারে"]
    if "mildew" in d:
        return ["পাতায় সাদা বা ধূসর গুঁড়ার মতো ছত্রাক দেখা যায়", "পাতা কুঁকড়ে যেতে পারে", "গাছের স্বাভাবিক বৃদ্ধি কমে যায়", "উষ্ণ ও আর্দ্র পরিবেশে ছড়ানোর ঝুঁকি বাড়ে"]
    if "rust" in d:
        return ["পাতায় মরিচা রঙের ছোট দানা দেখা যায়", "সংক্রমিত স্থানের চারপাশে হলুদ দাগ দেখা যায়", "আর্দ্র আবহাওয়ায় রোগ দ্রুত ছড়ায়", "গুরুতর অবস্থায় পাতার কার্যকারিতা কমে যায়"]
    if "blight" in d:
        return ["পাতায় বাদামি বা কালচে ক্ষত/দাগ দেখা যায়", "আক্রান্ত অংশের চারপাশে হলদে ভাব থাকে", "আর্দ্র পরিবেশে দাগ দ্রুত বড় হতে পারে", "পুরোনো পাতা শুকিয়ে আগেভাগে ঝরে যেতে পারে"]
    if "spot" in d or "scab" in d or "scorch" in d:
        return ["পাতার উপর গোলাকার বা অনিয়মিত দাগ দেখা যায়", "দাগের চারপাশে গাঢ় কিনারা থাকতে পারে", "আক্রান্ত অংশের কাছে হলদে ভাব দেখা যায়", "পাতার মান ও বৃদ্ধি কমে যেতে পারে"]
    return ["পাতায় অস্বাভাবিক দাগ বা প্যাটার্ন দেখা যায়", "পাতায় রঙ পরিবর্তন বা ক্ষত দেখা যেতে পারে", "গাছের স্বাভাবিক শক্তি কমে যেতে পারে", "রোগ ছড়াচ্ছে কি না দেখতে পাশের গাছগুলো পর্যবেক্ষণ করুন"]


def bn_treatment_dose(treatment_type: str, dose: str, disease: str = "") -> str:
    translated_dose = _lookup_bn(DOSE_BN, dose)
    if translated_dose:
        return translated_dose
    t = str(treatment_type or "").lower()
    d = str(disease or "").lower()
    if "organic" in t or "জৈব" in t:
        return "আক্রান্ত অংশ সরিয়ে ফেলুন এবং প্রয়োজন হলে সকালে অনুমোদিত জৈব/নিম-ভিত্তিক স্প্রে ব্যবহার করুন।"
    if "biological" in t or "জীবাণু" in t:
        return "লেবেল নির্দেশনা অনুযায়ী অনুমোদিত বায়ো-কন্ট্রোল পণ্য ব্যবহার করুন এবং মাটির স্বাস্থ্য বজায় রাখুন।"
    if "chemical" in t or "রাসায়নিক" in t:
        if "virus" in d:
            return "রাসায়নিক চিকিৎসার আগে স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শ নিন এবং বাহক পোকা নিয়ন্ত্রণ করুন।"
        return "স্থানীয় কৃষি বিশেষজ্ঞ/পণ্য লেবেল অনুযায়ী অনুমোদিত রাসায়নিক ব্যবহার করুন। অতিরিক্ত ব্যবহার এড়িয়ে চলুন।"
    return "চিকিৎসা প্রয়োগের আগে স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শ নিন।"


def bangla_report_item(item: dict) -> dict:
    src = dict(item or {})
    plant_bn = bn_plant(src.get("plant", "Plant"))
    disease_bn = bn_disease(src.get("disease", ""))
    is_healthy = str(src.get("severity", "")).lower() == "none" or "Healthy" in str(src.get("disease", ""))
    severity_bn = translate_value(src.get("severity", ""), "bn")
    confidence = src.get("confidence", "")
    overview = (
        f"আপলোড করা {plant_bn} পাতাটি সুস্থ মনে হচ্ছে। এআই মডেল কোনো শক্তিশালী রোগের লক্ষণ শনাক্ত করেনি। নিয়মিত পর্যবেক্ষণ ও প্রতিরোধমূলক যত্ন চালিয়ে যান।"
        if is_healthy else
        f"PhytoSentry এআই মডেল {plant_bn} পাতায় {disease_bn} শনাক্ত করেছে। আস্থার স্কোর {confidence}% এবং তীব্রতা {severity_bn}। রাসায়নিক চিকিৎসার আগে মাঠ পর্যায়ে নিশ্চিতকরণ ও স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শ নেওয়া উত্তম।"
    )
    symptoms = []
    for s in src.get("symptoms", []) or []:
        translated = _lookup_bn(SYMPTOM_BN, s) or _lookup_bn(REPORT_TEXT_BN, s) or str(s)
        if _contains_latin(translated):
            symptoms = []
            break
        symptoms.append(translated)
    if not symptoms:
        symptoms = bn_symptoms_for_disease(src.get("disease", ""), is_healthy)
    treatments = []
    for tr in src.get("treatments", []) or []:
        tr_type = translate_value(tr.get("type", ""), "bn")
        tr_name = _lookup_bn(TREATMENT_NAME_BN, tr.get("name", "")) or _lookup_bn(REPORT_TEXT_BN, tr.get("name", "")) or str(tr.get("name", ""))
        if _contains_latin(tr_name):
            tr_name = "প্রস্তাবিত চিকিৎসা"
        tr_dose = bn_treatment_dose(tr.get("type", ""), tr.get("dose", ""), src.get("disease", ""))
        treatments.append({**tr, "type": tr_type, "name": tr_name, "dose": tr_dose})
    prevention = []
    for p in src.get("prevention", []) or []:
        translated = _lookup_bn(PREVENTION_BN, p) or _lookup_bn(REPORT_TEXT_BN, p) or str(p)
        if not _contains_latin(translated):
            prevention.append(translated)
    if not prevention:
        prevention = [
            "নিয়মিত পাতা পরীক্ষা করুন এবং আক্রান্ত অংশ দ্রুত সরিয়ে ফেলুন",
            "বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন",
            "সকালে গাছের গোড়ায় পানি দিন; রাতে পাতা ভেজানো এড়িয়ে চলুন",
            "পরিষ্কার যন্ত্রপাতি ও রোগমুক্ত বীজ/চারা ব্যবহার করুন",
            "ফসল রোটেশন করুন এবং ফসল কাটার পর অবশিষ্টাংশ সরিয়ে ফেলুন",
        ]
    src.update({
        "plant": plant_bn,
        "disease": disease_bn,
        "scientific": bn_scientific(src.get("scientific", "")),
        "severity": severity_bn,
        "stage": translate_value(src.get("stage", ""), "bn"),
        "overview": overview,
        "symptoms": symptoms,
        "treatments": treatments,
        "prevention": prevention,
    })
    return src


def draw_wrapped(c, text, x, y, width, font, size, leading=15):
    c.setFont(font, size)
    lines = simpleSplit(str(text), font, size, width) or [str(text)]
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def ensure_page(c, y, font_regular, font_bold):
    if y < 80:
        c.showPage()
        draw_reportlab_logo_watermark(c, A4[0], A4[1])
        return A4[1] - 50
    return y


def draw_section(c, title, lines, x, y, width, font_regular, font_bold, bullet=False):
    y = ensure_page(c, y, font_regular, font_bold)
    c.setFillColorRGB(0.12, 0.35, 0.14)
    c.setFont(font_bold, 13)
    c.drawString(x, y, title)
    y -= 20
    c.setFillColorRGB(0, 0, 0)
    for line in lines:
        y = ensure_page(c, y, font_regular, font_bold)
        text = ("• " if bullet else "") + str(line)
        y = draw_wrapped(c, text, x + (10 if bullet else 0), y, width - (10 if bullet else 0), font_regular, 10, leading=14)
        y -= 2
    return y - 8

def bangla_font_path():
    candidates = [
        os.getenv("PHYTOSENTRY_BN_FONT", ""),
        str(ROOT / "assets" / "fonts" / "NotoSansBengali-Regular.ttf"),
        str(ROOT / "assets" / "fonts" / "SolaimanLipi.ttf"),
        str(ROOT / "assets" / "fonts" / "Kalpurush.ttf"),
        "C:/Windows/Fonts/Nirmala.ttf",
        "C:/Windows/Fonts/NirmalaS.ttf",
        "C:/Windows/Fonts/vrinda.ttf",
        "C:/Windows/Fonts/kalpurush.ttf",
        "C:/Windows/Fonts/SolaimanLipi.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansBengaliUI-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSerifBengali-Regular.ttf",
        "/usr/share/fonts/truetype/lohit-bengali/Lohit-Bengali.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
    ]
    for font_path in candidates:
        if font_path and Path(font_path).exists():
            return font_path
    return None


def wrap_text_pixels(draw, text, font, max_width):
    words = str(text).split()
    lines, current = [], ""
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=font)[2] <= max_width or not current:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [str(text)]



def logo_watermark_path():
    for p in [LOGO_PATH, LOGO_ICON_PATH, ROOT.parent / "frontend" / "public" / "phytosentry-logo-full.png", ROOT.parent / "frontend" / "public" / "phytosentry-icon.png"]:
        try:
            if p.exists():
                return p
        except Exception:
            pass
    return None


def add_logo_watermark_to_image(im):
    """Add a faint PhytoSentry logo watermark at the center of a PIL page image."""
    try:
        logo_path = logo_watermark_path()
        if not logo_path:
            return im
        logo = Image.open(logo_path).convert("RGBA")
        page = im.convert("RGBA")
        max_w = int(page.width * 0.54)
        max_h = int(page.height * 0.28)
        ratio = min(max_w / max(logo.width, 1), max_h / max(logo.height, 1), 1.0)
        logo = logo.resize((max(1, int(logo.width * ratio)), max(1, int(logo.height * ratio))), Image.LANCZOS)
        alpha = logo.getchannel("A").point(lambda a: int(a * 0.09))
        logo.putalpha(alpha)
        x = (page.width - logo.width) // 2
        y = (page.height - logo.height) // 2
        page.alpha_composite(logo, (x, y))
        return page.convert("RGB")
    except Exception:
        return im


def draw_reportlab_logo_watermark(c, w, h):
    """Add a faint logo watermark to ReportLab PDF pages."""
    try:
        from reportlab.lib.utils import ImageReader
        logo_path = logo_watermark_path()
        if not logo_path:
            return
        logo = Image.open(logo_path).convert("RGBA")
        max_w = w * 0.52
        max_h = h * 0.25
        ratio = min(max_w / max(logo.width, 1), max_h / max(logo.height, 1), 1.0)
        draw_w = logo.width * ratio
        draw_h = logo.height * ratio
        c.saveState()
        if hasattr(c, "setFillAlpha"):
            c.setFillAlpha(0.10)
        c.drawImage(ImageReader(logo), (w - draw_w) / 2, (h - draw_h) / 2, width=draw_w, height=draw_h, mask="auto")
        c.restoreState()
    except Exception:
        try:
            c.restoreState()
        except Exception:
            pass

def create_bangla_pdf_image(item: dict, pdf: Path):
    # PIL+RAQM shapes Bangla text correctly on systems with a Bangla font.
    from PIL import ImageDraw, ImageFont
    font_path = bangla_font_path()
    if not font_path:
        # Fall back to browser/ReportLab path when no Bangla font exists on the server.
        return False
    W, H = 1240, 1754  # A4 at roughly 150 DPI
    margin = 86
    try:
        layout_engine = ImageFont.Layout.RAQM
    except Exception:
        layout_engine = ImageFont.Layout.BASIC
    title_font = ImageFont.truetype(font_path, 42, layout_engine=layout_engine)
    h_font = ImageFont.truetype(font_path, 28, layout_engine=layout_engine)
    b_font = ImageFont.truetype(font_path, 23, layout_engine=layout_engine)
    font = ImageFont.truetype(font_path, 22, layout_engine=layout_engine)
    small = ImageFont.truetype(font_path, 18, layout_engine=layout_engine)
    pages = []

    def new_page():
        im = Image.new("RGB", (W, H), "white")
        im = add_logo_watermark_to_image(im)
        d = ImageDraw.Draw(im)
        return im, d, margin

    im, d, y = new_page()

    def ensure(y, needed=80):
        nonlocal im, d
        if y + needed > H - margin:
            pages.append(im)
            im, d, y2 = new_page()
            return y2
        return y

    def draw_wrapped_img(text, x, y, max_width, use_font=font, fill=(20, 35, 20), line_gap=10):
        for line in wrap_text_pixels(d, text, use_font, max_width):
            y = ensure(y, 45)
            d.text((x, y), line, font=use_font, fill=fill)
            y += use_font.size + line_gap
        return y

    def section(title, lines, y, bullet=False):
        y = ensure(y, 95)
        d.rounded_rectangle((margin-20, y-12, W-margin+20, y+44), radius=14, fill=(236, 248, 236), outline=(150, 196, 150), width=2)
        d.text((margin, y), title, font=h_font, fill=(25, 95, 40))
        y += 66
        for line in lines:
            prefix = "• " if bullet else ""
            y = draw_wrapped_img(prefix + str(line), margin + (18 if bullet else 0), y, W - 2*margin - 18, font)
            y += 6
        return y + 20

    d.text((margin, y), "PhytoSentry উদ্ভিদ রোগ শনাক্তকরণ রিপোর্ট", font=title_font, fill=(21, 98, 42))
    y += 68
    d.line((margin, y, W-margin, y), fill=(44, 130, 60), width=4)
    y += 34
    meta = [
        ("তারিখ", item.get("date", "")), ("ফসল/উদ্ভিদ", item.get("plant", "")),
        ("রোগ", item.get("disease", "")), ("বৈজ্ঞানিক নাম", item.get("scientific", "")),
        ("আস্থার স্কোর", f"{item.get('confidence', '')}%"), ("তীব্রতা", translate_value(item.get("severity", ""), "bn")),
        ("আক্রান্ত অংশ", item.get("affected_area", "")), ("অবস্থা", translate_value(item.get("stage", ""), "bn")),
    ]
    for k, v in meta:
        y = draw_wrapped_img(f"{k}: {v}", margin, y, W-2*margin, b_font)
    y += 20
    y = section("রোগের বিস্তারিত", [translate_report_text(item.get("overview", ""), "bn")], y)
    y = section("লক্ষণ", [translate_report_text(s, "bn") for s in item.get("symptoms", [])], y, bullet=True)
    treatments = []
    for tr in item.get("treatments", []):
        treatments.append(f"{translate_value(tr.get('type', ''), 'bn')} – {translate_report_text(tr.get('name', ''), 'bn')}: {translate_report_text(tr.get('dose', ''), 'bn')}")
    y = section("চিকিৎসা পরামর্শ", treatments, y, bullet=True)
    y = section("প্রতিরোধমূলক পরামর্শ", [translate_report_text(p, "bn") for p in item.get("prevention", [])], y, bullet=True)
    y = ensure(y, 50)
    d.text((margin, H-54), "PhytoSentry AI দ্বারা তৈরি · বাস্তব এআই স্ক্যান রিপোর্ট", font=small, fill=(80, 105, 80))
    pages.append(im)

    temp_imgs = []
    try:
        c = canvas.Canvas(str(pdf), pagesize=A4)
        for idx, page in enumerate(pages):
            img_path = REPORTS / f"_bn_page_{uuid.uuid4().hex}_{idx}.png"
            page.save(img_path, "PNG")
            temp_imgs.append(img_path)
            c.drawImage(str(img_path), 0, 0, width=A4[0], height=A4[1])
            c.showPage()
        c.save()
        return True
    finally:
        for img_path in temp_imgs:
            try:
                img_path.unlink()
            except Exception:
                pass


@app.get("/api/report/{result_id}")
def report(result_id: str, lang: str = "en", token: str | None = None, authorization: str | None = Header(None)):
    item = find_scan_result(result_id) or demo_prediction()
    owner_id = item.get("user_id")
    if owner_id:
        row = user_from_token(token or token_from_authorization(authorization))
        if not row or row["id"] != owner_id:
            raise HTTPException(status_code=401, detail="Login required to download this private report.")
    item["id"] = result_id
    if lang == "bn":
        item = bangla_report_item(item)
    suffix = "bn" if lang == "bn" else "en"
    pdf = REPORTS / f"phytosentry_report_{result_id}_{suffix}.pdf"
    if lang == "bn" and create_bangla_pdf_image(item, pdf):
        return FileResponse(pdf, media_type="application/pdf", filename=pdf.name)
    c = canvas.Canvas(str(pdf), pagesize=A4)
    w, h = A4
    draw_reportlab_logo_watermark(c, w, h)
    font_regular, font_bold = pdf_fonts(lang)
    labels = report_labels(lang)

    y = h - 52
    c.setFont(font_bold, 18 if lang == "bn" else 22)
    draw_wrapped(c, labels["title"], 45, y, w - 90, font_bold, 18 if lang == "bn" else 22, leading=24)
    y -= 42
    c.setStrokeColorRGB(0.15, 0.45, 0.18)
    c.line(45, y, w - 45, y)
    y -= 26

    meta = [
        (labels["date"], item["date"]),
        (labels["plant"], item["plant"]),
        (labels["disease"], item["disease"]),
        (labels["scientific"], item["scientific"]),
        (labels["confidence"], f"{item['confidence']}%"),
        (labels["severity"], translate_value(item["severity"], lang)),
        (labels["affected"], item["affected_area"]),
        (labels["stage"], translate_value(item["stage"], lang)),
    ]
    c.setFont(font_regular, 10.5)
    for key, value in meta:
        draw_wrapped(c, f"{key}: {value}", 45, y, w - 90, font_regular, 10.5, leading=15)
        y -= 17

    y -= 6
    y = draw_section(c, labels["details"], [translate_report_text(item["overview"], lang)], 45, y, w - 90, font_regular, font_bold)
    y = draw_section(c, labels["symptoms"], [translate_report_text(s, lang) for s in item["symptoms"]], 45, y, w - 90, font_regular, font_bold, bullet=True)
    treatment_lines = []
    for t in item["treatments"]:
        treatment_lines.append(f"{translate_value(t['type'], lang)} – {translate_report_text(t['name'], lang)}: {translate_report_text(t['dose'], lang)}")
    y = draw_section(c, labels["treatments"], treatment_lines, 45, y, w - 90, font_regular, font_bold, bullet=True)
    y = draw_section(c, labels["prevention"], [translate_report_text(p, lang) for p in item["prevention"]], 45, y, w - 90, font_regular, font_bold, bullet=True)

    c.setFont(font_regular, 8.5)
    c.setFillColorRGB(0.35, 0.45, 0.35)
    c.drawString(45, 28, "Generated by PhytoSentry AI · Real AI scan report" if lang == "en" else "PhytoSentry AI দ্বারা তৈরি · বাস্তব এআই স্ক্যান রিপোর্ট")
    c.save()
    return FileResponse(pdf, media_type="application/pdf", filename=pdf.name)
