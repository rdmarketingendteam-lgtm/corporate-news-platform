import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
import logging

from app.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_TLS,
    ADMIN_NOTIFICATION_EMAIL
)

logger = logging.getLogger("email_service")

def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict[str, Any]:
    """
    Sends an email via SMTP. If SMTP credentials are not configured,
    logs the event and returns a status dict indicating SMTP is not configured.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(
            f"[EMAIL_DISPATCHER] SMTP credentials not set in apps/scraper/.env. "
            f"Would have sent email to '{to_email}' with subject '{subject}'."
        )
        return {
            "success": False,
            "sent": False,
            "reason": "SMTP_NOT_CONFIGURED",
            "message": "SMTP credentials (SMTP_USER, SMTP_PASSWORD) are not configured in apps/scraper/.env."
        }

    from_email = SMTP_FROM_EMAIL or SMTP_USER
    from_header = f"{SMTP_FROM_NAME} <{from_email}>" if SMTP_FROM_NAME else from_email

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_header
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12)
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"[EMAIL_DISPATCHER] Successfully sent email to '{to_email}' (Subject: '{subject}') via {SMTP_HOST}:{SMTP_PORT}.")
        return {"success": True, "sent": True, "method": "smtp", "recipient": to_email}
    except Exception as e:
        logger.error(f"[EMAIL_DISPATCHER] Failed to send email to '{to_email}': {e}")
        return {
            "success": False,
            "sent": False,
            "reason": "SMTP_ERROR",
            "error": str(e)
        }

def send_otp_email(to_email: str, otp_code: str) -> Dict[str, Any]:
    """
    Sends the 6-digit authentication OTP to the user's Gmail address.
    """
    subject = f"{otp_code} is your Newspaper Pro Security Code"
    
    text_content = f"""
Newspaper Pro - Editorial Security Verification

Your One-Time Passcode (OTP) is: {otp_code}

This verification code is valid for 5 minutes.
Use this code to sign in and access your Backlink Profile & Guest Forum Publisher Dashboard.

For your security, never share this code with anyone. Our editors and support staff will never ask for your OTP.

If you did not request this verification code, please ignore this email.
    """.strip()

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 16px; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #4db2ec;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
        NEWSPAPER <span style="color: #4db2ec;">PRO</span>
      </h1>
      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">
        Editorial Authority &amp; Contributor Portal
      </div>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
        Your One-Time Passcode (OTP)
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
        Use the 6-digit security code below to complete your login or registration for <strong>{to_email}</strong>.
      </p>

      <!-- OTP Box -->
      <div style="background: #f1f5f9; border: 2px dashed #4db2ec; border-radius: 4px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
          {otp_code}
        </span>
        <div style="font-size: 12px; font-weight: 600; color: #e11d48; margin-top: 8px;">
          ⏱ Valid for 5 minutes only
        </div>
      </div>

      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 2px; margin-bottom: 24px; font-size: 12px; color: #92400e; line-height: 1.5;">
        <strong>Security Notice:</strong> Never share this code with anyone. Newspaper Pro administrators will never ask for your verification code.
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
        If you did not request this verification code, please ignore this email or review your Google Account security.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; text-align: center;">
      © {os.getenv("NEXT_PUBLIC_PUBLICATION_NAME", "Newspaper Pro")} · All rights reserved.
    </div>
  </div>
</body>
</html>
    """.strip()

    return send_email(to_email, subject, html_content, text_content)

def send_newsletter_welcome_email(to_email: str) -> Dict[str, Any]:
    """
    Sends the welcome digest email to a new newsletter subscriber.
    """
    subject = "Welcome to Newspaper Pro Morning Digest!"

    text_content = f"""
Welcome to Newspaper Pro Daily Briefing!

Thank you for subscribing to our morning editorial digest.
Every weekday at 7:00 AM IST, you will receive our hand-curated executive brief covering:
- Technology, Telecom & Edge Compute
- Corporate Business & Market Capital
- Sports Analytics & Cricket Test Match Analysis
- Entertainment, Culture & Global Affairs

Visit our digital edition anytime: http://192.168.102.43:3002

Notice & Takedown SLA: editorial@newspaperpro.com
    """.strip()

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Newspaper Pro</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 16px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #4db2ec;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
        NEWSPAPER <span style="color: #4db2ec;">PRO</span>
      </h1>
      <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">
        Daily Morning Digest · Executive Edition
      </div>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
        Welcome to the Editorial Briefing! 🎉
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        Thank you for subscribing, <strong>{to_email}</strong>. You are now connected to India&apos;s leading syndicated corporate news intelligence platform.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin: 0 0 10px 0;">
          What to Expect in Your Inbox:
        </h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
          <li><strong>Technology &amp; Telecom:</strong> 5G infrastructure, AI accelerators, and cloud networks.</li>
          <li><strong>Business &amp; Finance:</strong> Corporate quarterly earnings, mergers, and market trends.</li>
          <li><strong>Sports &amp; Cricket:</strong> Test match reports, match analysis, and player updates.</li>
          <li><strong>Entertainment &amp; Media:</strong> Box office analysis, production reviews, and streaming trends.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="http://192.168.102.43:3002" style="background-color: #4db2ec; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 800; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
          Read Today&apos;s Live Edition →
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
        Editorial Notice: Content and images are curated for non-commercial current affairs commentary under Fair Dealing. For inquiries or 24-hr Notice &amp; Takedown requests, contact <a href="mailto:editorial@newspaperpro.com" style="color: #4db2ec;">editorial@newspaperpro.com</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; text-align: center;">
      You subscribed to Newspaper Pro Daily Briefing with {to_email}.
    </div>
  </div>
</body>
</html>
    """.strip()

    res = send_email(to_email, subject, html_content, text_content)

    # Also notify admin if configured
    admin_target = ADMIN_NOTIFICATION_EMAIL or (SMTP_USER if SMTP_USER and "@" in SMTP_USER else None)
    if admin_target:
        admin_subject = f"New Subscriber: {to_email}"
        admin_body = f"<p>A new user has subscribed to the Newspaper Pro newsletter:</p><p><strong>Email:</strong> {to_email}</p>"
        send_email(admin_target, admin_subject, admin_body)

    return res
