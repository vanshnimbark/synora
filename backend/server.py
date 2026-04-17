"""
Synora backend stub — only purpose is to serve mock OTP auth via
Supabase admin API (service role) so we can bypass email confirmation.
Everything else is Supabase (DB, storage, realtime).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

app = FastAPI(title="Synora API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _phone_to_email(phone: str) -> str:
    return f"u{phone}@synora.app"


def _phone_to_password(phone: str) -> str:
    return f"Synora!{phone}#mvp"


def _auth_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "synora-backend",
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok"}


class MockOtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    otp: str = Field(min_length=6, max_length=6)


class MockOtpResponse(BaseModel):
    email: str
    password: str
    created: bool


@app.post("/api/auth/mock-otp", response_model=MockOtpResponse)
async def mock_otp_verify(payload: MockOtpRequest) -> MockOtpResponse:
    """
    Mock OTP verification: accepts any 6-digit code and ensures a confirmed
    Supabase auth user exists for (phone). Returns the deterministic email
    and password so the client can call supabase.auth.signInWithPassword.

    In production: replace with real Twilio OTP validation, then do the
    same admin-side user provisioning.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(500, "Supabase admin credentials not configured")

    phone = "".join(ch for ch in payload.phone if ch.isdigit())
    if len(phone) != 10:
        raise HTTPException(400, "Phone must be 10 digits")
    if not payload.otp.isdigit() or len(payload.otp) != 6:
        raise HTTPException(400, "OTP must be 6 digits")
    # In mock mode we accept ANY 6-digit code.

    email = _phone_to_email(phone)
    password = _phone_to_password(phone)

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1) Try to find existing user by email
        list_res = await client.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=_auth_headers(),
            params={"email": email},
        )
        if list_res.status_code >= 400:
            raise HTTPException(
                list_res.status_code, f"Supabase lookup failed: {list_res.text[:200]}"
            )
        list_body = list_res.json()
        users = list_body.get("users") if isinstance(list_body, dict) else list_body
        existing = None
        if isinstance(users, list):
            for u in users:
                if (u.get("email") or "").lower() == email.lower():
                    existing = u
                    break

        if existing:
            # Ensure email is confirmed and password is correct (rotate if needed)
            user_id = existing["id"]
            patch = {"email_confirm": True, "password": password}
            upd = await client.put(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers=_auth_headers(),
                json=patch,
            )
            if upd.status_code >= 400:
                raise HTTPException(
                    upd.status_code, f"Supabase update failed: {upd.text[:200]}"
                )
            return MockOtpResponse(email=email, password=password, created=False)

        # 2) Create a new confirmed user
        create_res = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=_auth_headers(),
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "phone": f"+91{phone}",
                "user_metadata": {"mock_phone": phone, "provider": "mock_otp"},
            },
        )
        if create_res.status_code >= 400:
            raise HTTPException(
                create_res.status_code,
                f"Supabase create failed: {create_res.text[:200]}",
            )

        return MockOtpResponse(email=email, password=password, created=True)
