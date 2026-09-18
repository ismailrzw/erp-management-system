# backend/app/services/email_service.py
"""
Email Service Module — PBL Management System.

Handles automated transactional emails:
  1. Student account creation -> One-time password setup link
  2. Ungrouped student notification reminders

Supports SendGrid, standard SMTP (smtplib), and safe dev/test logger fallback.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import Config

logger = logging.getLogger(__name__)


def _dispatch_email(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """
    Internal dispatcher for transactional emails.
    """
    provider = getattr(Config, "MAIL_PROVIDER", "smtp")
    from_name = getattr(Config, "MAIL_FROM_NAME", "PBL Portal - BNU")
    from_address = getattr(Config, "MAIL_FROM_ADDRESS", "noreply@bnu.edu.pk")

    # 1. SendGrid Provider
    if provider == "sendgrid" and getattr(Config, "SENDGRID_API_KEY", ""):
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=(from_address, from_name),
                to_emails=to_email,
                subject=subject,
                plain_text_content=text_content,
                html_content=html_content,
            )
            sg = SendGridAPIClient(Config.SENDGRID_API_KEY)
            response = sg.send(message)
            if response.status_code in (200, 201, 202):
                logger.info("SendGrid email sent successfully to %s", to_email)
                return True
            logger.warning("SendGrid returned status code %s for %s", response.status_code, to_email)
        except Exception as exc:  # noqa: BLE001
            logger.error("SendGrid dispatch failed for %s: %s", to_email, exc)

    # 2. SMTP Provider (Standard Library smtplib)
    smtp_host = getattr(Config, "SMTP_HOST", "")
    smtp_port = getattr(Config, "SMTP_PORT", 587)
    smtp_user = getattr(Config, "SMTP_USER", "")
    smtp_password = getattr(Config, "SMTP_PASSWORD", "")

    if smtp_host and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_address}>"
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain", "utf-8")
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.ehlo()
                if server.has_extn("STARTTLS"):
                    server.starttls()
                    server.ehlo()

            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)

            server.sendmail(from_address, [to_email], msg.as_string())
            server.quit()
            logger.info("SMTP email sent successfully to %s", to_email)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("SMTP dispatch failed for %s: %s", to_email, exc)

    # 3. Development / Local Fallback (Logs to console)
    logger.info(
        "\n==================== [DEV EMAIL DISPATCH] ====================\n"
        "To: %s\n"
        "Subject: %s\n"
        "Body:\n%s\n"
        "===============================================================",
        to_email,
        subject,
        text_content,
    )
    return True


def send_password_set_email(to_email: str, student_name: str, set_link: str) -> bool:
    """
    Sends the account activation / password-set email to a new student.
    """
    from_name = getattr(Config, "MAIL_FROM_NAME", "PBL Portal - BNU")
    subject = "Beaconhouse National University — Set Up Your PBL Portal Password"

    text_content = f"""Dear {student_name},

An account has been created for you on the Beaconhouse National University PBL Management System.

Please follow the link below to set your account password and activate your portal access:
{set_link}

Note: This link is valid for 24 hours. If it expires, please contact your PBL Manager to request a new setup link.

Best regards,
Department of Computer Science
Beaconhouse National University
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #1e3a8a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Beaconhouse National University</h1>
      <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">Project-Based Learning (PBL) Management System</p>
    </div>
    <div style="padding: 28px 24px;">
      <h2 style="font-size: 17px; color: #0f172a; margin-top: 0;">Welcome, {student_name}!</h2>
      <p>An official student account has been created for you on the PBL Management System.</p>
      <p>To access your dashboard, submit deliverables, and participate in project group activities, please click the button below to set your password:</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="{set_link}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Set Your Password
        </a>
      </div>

      <p style="font-size: 12.5px; color: #64748b; margin-top: 24px;">
        Or copy and paste this link into your browser:<br>
        <a href="{set_link}" style="color: #2563eb; word-break: break-all;">{set_link}</a>
      </p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; font-size: 12px; color: #991b1b; margin-top: 20px;">
        <strong>Notice:</strong> This password setup link is valid for 24 hours.
      </div>
    </div>
    <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      © {from_name}. Beaconhouse National University.
    </div>
  </div>
</body>
</html>
"""
    return _dispatch_email(to_email, subject, text_content, html_content)


def send_ungrouped_notification(to_email: str, student_name: str, deadline: str, custom_message: str = None) -> bool:
    """
    Sends a reminder email to a student who has not yet joined a project group.
    """
    from_name = getattr(Config, "MAIL_FROM_NAME", "PBL Portal - BNU")
    frontend_url = getattr(Config, "FRONTEND_URL", "http://localhost:5173")
    subject = "Reminder: Project Group Formation Deadline — PBL Portal"

    deadline_text = f"Group Formation Deadline: {deadline}" if deadline else "Group formation deadline is approaching."
    custom_text = f"\nManager Note:\n{custom_message}\n" if custom_message else ""

    text_content = f"""Dear {student_name},

This is a reminder from the PBL Management System. According to our records, you are currently not a member of any registered project group.

{deadline_text}
{custom_text}
Please log in to the portal as soon as possible to either create a group with your peers or accept a pending group invitation.

Login URL: {frontend_url}/login

Best regards,
PBL Management Office
Beaconhouse National University
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #d97706; padding: 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">Project Group Formation Reminder</h1>
      <p style="color: #fef3c7; margin: 4px 0 0; font-size: 13px;">Beaconhouse National University · PBL Portal</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">Dear {student_name},</p>
      <p>Our records indicate that you have not joined or formed a project group yet for your enrolled course.</p>

      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 14px; margin: 18px 0; color: #92400e; font-size: 13.5px;">
        <strong>Deadline Notice:</strong> {deadline if deadline else 'Please form your group as soon as possible.'}
      </div>

      {f'<div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 10px 14px; margin: 16px 0; font-size: 13px; color: #1e293b;"><strong>Manager Note:</strong> {custom_message}</div>' if custom_message else ''}

      <p>Please log in to your portal to create a group or accept an invitation from your section peers:</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="{frontend_url}/login" target="_blank" style="background-color: #d97706; color: #ffffff; padding: 11px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13.5px; display: inline-block;">
          Go to PBL Portal
        </a>
      </div>
    </div>
    <div style="background-color: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11.5px; color: #64748b; border-top: 1px solid #e2e8f0;">
      © {from_name}. Beaconhouse National University.
    </div>
  </div>
</body>
</html>
"""
    return _dispatch_email(to_email, subject, text_content, html_content)
