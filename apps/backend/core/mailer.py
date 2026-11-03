"""Outgoing email over SMTP, standard library only.

Configured by SMTP_HOST / SMTP_PORT (587, STARTTLS) / SMTP_USER / SMTP_PASSWORD / SMTP_FROM.
With no SMTP_HOST (a dev laptop) the message is printed to the server log instead, so the
reset flow can still be finished by hand. A failure is logged, never raised: the caller runs
this after the response, and the response must not reveal whether an address is registered.
"""
import os
import smtplib
import ssl
from email.message import EmailMessage

RESET_SUBJECT = "Kode reset kata sandi Sajiwa"


def _reset_body(otp: str) -> str:
    return (
        "Halo,\n\n"
        f"Kode untuk mengatur ulang kata sandi Sajiwa kamu: {otp}\n\n"
        "Kode ini berlaku 15 menit dan hanya bisa dipakai sekali. Masukkan di aplikasi pada layar "
        "Lupa kata sandi.\n\n"
        "Kalau kamu tidak meminta reset, abaikan email ini; kata sandimu tidak berubah.\n\n"
        "Salam,\nSajiwa"
    )


def send_reset_otp(to: str, otp: str) -> bool:
    """True when the mail server accepted the message."""
    host = os.getenv("SMTP_HOST")
    if not host:
        print(f"[reset-password] SMTP belum diatur; OTP untuk {to}: {otp}", flush=True)
        return False
    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER", "")
    message["To"] = to
    message["Subject"] = RESET_SUBJECT
    message.set_content(_reset_body(otp))
    try:
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=20) as server:
            server.starttls(context=ssl.create_default_context())
            if os.getenv("SMTP_USER"):
                server.login(os.environ["SMTP_USER"], os.getenv("SMTP_PASSWORD", ""))
            server.send_message(message)
        return True
    except (OSError, smtplib.SMTPException) as exc:
        # The OTP stays out of this line: a mail outage must not put live codes in the logs
        print(f"[reset-password] email ke {to} gagal dikirim: {exc}", flush=True)
        return False
