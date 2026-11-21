@echo off
REM Password Reset Email Service Configuration Guide
REM Run this script to configure and test the email service

echo.
echo ==========================================
echo Smart Hospital - Email Service Setup
echo ==========================================
echo.

REM Check if .env exists
if not exist .env (
    echo ^! .env file not found!
    echo Creating .env from .env.example...
    if exist .env.example (
        copy .env.example .env
    ) else (
        echo ERROR: .env.example not found!
        pause
        exit /b 1
    )
    echo ^+ .env created. Please fill in the email credentials.
    echo.
)

REM Display current email configuration
echo Current Email Configuration in .env:
echo ---
findstr /R "EMAIL_" .env > nul && findstr /R "EMAIL_" .env || echo No EMAIL_* variables found
findstr /R "FRONTEND_URL" .env > nul && findstr /R "FRONTEND_URL" .env || echo FRONTEND_URL not set
echo ---
echo.

REM Configuration options
echo Email Service Setup Options:
echo.
echo 1) Gmail (Recommended for Testing)
echo    - Enable 2FA on Google Account
echo    - Generate App Password at https://myaccount.google.com/apppasswords
echo    - Use 16-character password (without spaces) as EMAIL_PASSWORD
echo.
echo 2) Outlook / Office 365
echo    - Use your email address and password
echo    - Set EMAIL_SERVICE=outlook
echo.
echo 3) SendGrid (Production Recommended)
echo    - Sign up at https://sendgrid.com
echo    - Generate API key
echo    - Set EMAIL_SERVICE=sendgrid
echo.
echo 4) Custom SMTP Server
echo    - Configure manually in .env with custom settings
echo.

echo Setup Instructions:
echo 1. Choose your email service from options above
echo 2. Update .env with EMAIL_SERVICE, EMAIL_USER, EMAIL_PASSWORD
echo 3. Set FRONTEND_URL to your frontend domain
echo 4. Save and restart the server
echo 5. Run the test script (test-email-service.bat)
echo.

echo Testing Email Service:
echo After configuring .env, run: test-email-service.bat
echo.

echo ^+ Email Templates Are Ready:
echo    ^/ Password Reset Email ^(HTML + Plain Text^)
echo    ^/ Email Verification Email
echo    ^/ Welcome Email
echo.

echo ^+ Security Features Implemented:
echo    ^/ JWT token generation ^(1-hour expiration^)
echo    ^/ Token signature verification
echo    ^/ Database token comparison
echo    ^/ Password hashing ^(bcryptjs, 10 rounds^)
echo    ^/ Account lock reset after password reset
echo    ^/ Single-use tokens
echo.

echo For detailed documentation, see: PASSWORD_RESET.md
echo.

pause
