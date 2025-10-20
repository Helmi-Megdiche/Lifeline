# Email Configuration for Password Reset
# 
# To use Gmail:
# 1. Enable 2-factor authentication on your Gmail account
# 2. Generate an App Password: https://myaccount.google.com/apppasswords
# 3. Set these environment variables:
#
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-16-character-app-password
# FRONTEND_URL=http://localhost:3000
#
# For testing, you can also use other SMTP providers like:
# - SendGrid
# - Mailgun  
# - AWS SES
# - Outlook/Hotmail
#
# Just update the transporter configuration in email.service.ts
