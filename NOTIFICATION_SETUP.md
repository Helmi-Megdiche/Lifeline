# Email Notification Setup Guide

## Overview
LifeLine uses **Email notifications only** via Nodemailer to send emergency alerts to contacts. All Twilio/SMS/WhatsApp functionality has been removed.

## Configure Email (Gmail)

### Step 1: Enable App Password
1. Go to your Google Account settings: https://myaccount.google.com/
2. Enable **2-Step Verification** (required for app passwords)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Select "Mail" as the app and "Other" as the device
5. Name it "LifeLine Backend" and click "Generate"
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 2: Add to `.env` file
Add these variables to `lifeline-backend/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

**Important Notes:**
- Use your full Gmail address (e.g., `yourname@gmail.com`)
- Use the app password (not your regular Gmail password)
- Remove spaces from the app password if copying (should be 16 characters without spaces)

### Step 3: Verify Nodemailer is Installed
Nodemailer should already be installed. If not:
```bash
cd lifeline-backend
npm install nodemailer
```

### Step 4: Restart Backend
Restart your backend server. You should see:
```
[EmailNotifierService] 🔍 Email config check: User=SET, Pass=SET
[EmailNotifierService] ✅ Nodemailer transporter initialized successfully
```

---

## Verification

After configuration, when you trigger a voice alert, you should see in the backend logs:

```
[EmailNotifierService] 📧 Sending REAL Email via Nodemailer to contact@example.com
[EmailNotifierService] ✅ Email sent successfully via Nodemailer to contact@example.com
```

If you still see "MOCK" warnings, check:
- Environment variables are set correctly in `lifeline-backend/.env`
- No typos in `EMAIL_USER` or `EMAIL_PASS`
- Backend was restarted after adding the variables
- App password is correct (16 characters, no spaces)

---

## Email Content

Emergency alert emails include:
- **User Information**: Name and timestamp
- **Category**: Type of emergency (Fire, Medical, Security, etc.)
- **Urgency Level**: Critical, High, Medium, or Low (with color coding)
- **Voice Transcript**: What the user said when triggering the alert
- **Exact Location**: GPS coordinates with a clickable Google Maps link
- **Action Required**: Clear instructions for the recipient

All emails are sent in a professional, well-formatted HTML template that works on all email clients.

---

## Troubleshooting

### "MOCK Email" warnings
- Check that `EMAIL_USER` and `EMAIL_PASS` are in your `.env` file
- Verify the app password is correct (16 characters)
- Ensure 2-Step Verification is enabled on your Google account

### Email not sending
- Check backend logs for specific error messages
- Verify your Gmail account allows "Less secure app access" (if using older accounts)
- Try generating a new app password
- Check spam/junk folder in recipient's email

### "Email credentials incomplete" warning
- Make sure both `EMAIL_USER` and `EMAIL_PASS` are set
- No quotes needed around values in `.env` file
- Restart backend after changing `.env` file
