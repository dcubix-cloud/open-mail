"""A throwaway Open Mail backend for the website's screenshots (run by shots/shoot.mjs).

Fresh database in a temporary DATA_DIR, seeded with the hero's sample team and mail: Sana at
yourcompany.com, a shared Support mailbox, and the inbox the hero demo shows. Resend is replaced by
the backend tests' fake, so nothing leaves the machine.
"""

import os
import sys
import tempfile
import uuid
from datetime import timedelta
from pathlib import Path
from unittest import mock

BACKEND = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND))

API_PORT = os.environ.get("SHOTS_API_PORT", "8767")
WEB_PORT = os.environ.get("SHOTS_WEB_PORT", "5197")
DOMAIN = "yourcompany.com"
PASSWORD = "shots-password-123"

# Set before Django loads settings, so a developer's .env can't leak in.
os.environ.update(
    DJANGO_SETTINGS_MODULE="config.settings",
    DATA_DIR=tempfile.mkdtemp(prefix="openmail-shots-"),
    RESEND_API_KEY="re_shots",
    RESEND_WEBHOOK_SECRET="",
    ACTIVATION_KEY="shots-activation-key-0123",
    PUBLIC_URL=f"http://127.0.0.1:{WEB_PORT}",
    ALLOWED_HOSTS="localhost,127.0.0.1",
    CSRF_TRUSTED_ORIGINS="",
)

import django  # noqa: E402
from django.conf import settings  # noqa: E402

settings.LOGGING.setdefault("loggers", {})["django.server"] = {"level": "WARNING"}
django.setup()

from django.core.management import call_command  # noqa: E402
from django.utils import timezone  # noqa: E402

from accounts.models import User  # noqa: E402
from mail.addresses import search_text  # noqa: E402
from mail.models import Address, Mailbox, Message, SiteConfig  # noqa: E402
from mail.sanitize import html_to_text, make_snippet  # noqa: E402
from mail.tests.helpers import FakeResend  # noqa: E402


def person(local: str, name: str, **extra) -> User:
    user = User.objects.create_user(f"{local}@{DOMAIN}", PASSWORD, name=name, **extra)
    mailbox = Mailbox.objects.create(kind=Mailbox.Kind.PERSONAL, user=user)
    Address.objects.create(mailbox=mailbox, email=user.email, is_primary=True)
    return user


def message(mailbox, kind, sender, to, subject, html, ago, thread=None, read=False, attachments=False):
    text = html_to_text(html)
    return Message.objects.create(
        mailbox=mailbox,
        kind=kind,
        thread_key=thread or uuid.uuid4().hex,
        message_id=f"<{uuid.uuid4().hex}@{sender[1].split('@')[1]}>",
        subject=subject,
        from_name=sender[0],
        from_email=sender[1],
        to=to,
        html_body=html,
        text_body=text,
        snippet=make_snippet(text),
        search_from=search_text([{"name": sender[0], "email": sender[1]}]),
        search_to=search_text(to),
        date=timezone.now() - ago,
        is_read=read,
        has_attachments=attachments,
    )


def seed() -> None:
    config = SiteConfig.get()
    config.domain = DOMAIN
    config.setup_complete = True
    config.save()

    sana = person("sana", "Sana", is_admin=True, is_owner=True)
    maya = person("maya", "Maya Rao")
    support = Mailbox.objects.create(kind=Mailbox.Kind.SHARED, name="Support")
    Address.objects.create(mailbox=support, email=f"support@{DOMAIN}", is_primary=True)
    support.members.set([sana, maya])

    box = sana.mailbox
    me = [{"name": "Sana", "email": sana.email}]
    received = Message.Kind.RECEIVED

    message(box, received, ("Accounts Team", "billing@vendor.example"), me, "Invoice INV-2026-0142",
            "<p>Hi Sana, please find invoice INV-2026-0142 attached. Total due: 420.00 USD.</p>",
            timedelta(days=4, hours=8), read=True, attachments=True)
    message(box, received, ("Northwind Weekly", "news@northwind.example"), me, "Your weekend reading list",
            "<p>Five long reads for the weekend, and a soup recipe worth the effort.</p>",
            timedelta(days=2, hours=3), read=True)
    thread = uuid.uuid4().hex
    message(box, Message.Kind.SENT, ("Sana", sana.email), [{"name": "Alicia Chen", "email": "alicia@example.org"}],
            "Feedback on the onboarding flow", "<p>Could you take a look at the new onboarding flow?</p>",
            timedelta(hours=3), thread=thread, read=True)
    message(box, received, ("Alicia Chen", "alicia@example.org"), me, "Re: Feedback on the onboarding flow",
            "<p>+1 from me. I have a few screenshots of the DNS step.</p>", timedelta(minutes=95), thread=thread,
            attachments=True)
    message(box, received, ("Sam Patel", "sam@example.net"), me, "Lunch on Friday?",
            "<p>Hey! Are you free for lunch on Friday? The new ramen place opened near the office.</p>",
            timedelta(minutes=34))
    message(support, received, ("Priya Shah", "priya@customer.example"), [{"name": "Support", "email": f"support@{DOMAIN}"}],
            "Can't sign in after the update", "<p>Since this morning the sign-in page keeps reloading.</p>",
            timedelta(minutes=12))


mock.patch("mail.resend.client", return_value=FakeResend()).start()
call_command("migrate", interactive=False, verbosity=0)
seed()
call_command("runserver", f"127.0.0.1:{API_PORT}", use_reloader=False)
