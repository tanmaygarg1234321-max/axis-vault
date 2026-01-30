
# Switch to Gmail SMTP for Email Delivery

## Overview
Replace the current Brevo SMTP configuration with Gmail SMTP to send transactional emails (receipts, failed payment notifications, and rank expiry reminders).

---

## What Will Change

### 1. Update Secrets
Store the Gmail SMTP credentials securely:
- **GMAIL_SMTP_USER**: `axiseconomy@gmail.com`
- **GMAIL_SMTP_PASSWORD**: The App Password you provided

### 2. Update Edge Function
Modify `supabase/functions/send-email/index.ts` to:
- Use Gmail's SMTP server (`smtp.gmail.com`) on port 587
- Read credentials from `GMAIL_SMTP_USER` and `GMAIL_SMTP_PASSWORD`
- Set the sender email to `axiseconomy@gmail.com`
- Keep all existing email templates (receipt, failed, expiry reminder)

### 3. Deploy & Test
- Redeploy the `send-email` function
- Make a test purchase to verify emails arrive

---

## Technical Details

**Gmail SMTP Configuration:**
```text
Host: smtp.gmail.com
Port: 587
Encryption: STARTTLS
Username: axiseconomy@gmail.com
Password: (App Password)
```

**Code changes in send-email/index.ts:**
- Replace `BREVO_SMTP_LOGIN` / `BREVO_API_KEY` references with `GMAIL_SMTP_USER` / `GMAIL_SMTP_PASSWORD`
- Change `smtpHost` from `smtp-relay.brevo.com` to `smtp.gmail.com`
- Update sender email to use Gmail address
- Keep port 587 and STARTTLS configuration (same as current)

---

## Important Notes
- The password you provided looks like a Gmail App Password (16-character format), which is correct for SMTP access
- Gmail allows 500 emails/day for free accounts, which should be sufficient for your store
- Emails will come from `axiseconomy@gmail.com`
