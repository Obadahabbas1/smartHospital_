@echo off
REM Test Email Service Configuration
REM This script tests the email service by sending a test email

echo.
echo ==========================================
echo Smart Hospital - Email Service Test
echo ==========================================
echo.

REM Check if .env exists
if not exist .env (
    echo ^! ERROR: .env file not found!
    echo Please run setup-email-service.bat first
    pause
    exit /b 1
)

echo Checking environment variables...

REM Extract environment variables from .env
for /f "tokens=2 delims==" %%a in ('findstr /B "EMAIL_USER=" .env') do set EMAIL_USER=%%a
for /f "tokens=2 delims==" %%a in ('findstr /B "EMAIL_PASSWORD=" .env') do set EMAIL_PASSWORD=%%a
for /f "tokens=2 delims==" %%a in ('findstr /B "EMAIL_SERVICE=" .env') do set EMAIL_SERVICE=%%a
for /f "tokens=2 delims==" %%a in ('findstr /B "FRONTEND_URL=" .env') do set FRONTEND_URL=%%a

REM Set defaults if not found
if not defined EMAIL_SERVICE set EMAIL_SERVICE=gmail
if not defined FRONTEND_URL set FRONTEND_URL=http://localhost:5173

if not defined EMAIL_USER or not defined EMAIL_PASSWORD (
    echo ^! ERROR: EMAIL_USER or EMAIL_PASSWORD not set in .env
    echo Please configure email credentials first
    pause
    exit /b 1
)

echo ^+ EMAIL_USER: %EMAIL_USER%
echo ^+ EMAIL_SERVICE: %EMAIL_SERVICE%
echo ^+ FRONTEND_URL: %FRONTEND_URL%
echo.

REM Create test payload
set TEST_EMAIL=%EMAIL_USER%
set TEST_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmQ0ZWE2YTBkOWE0ZDBhMDEyMzQ1NjciLCJ0eXBlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE3MjU0NTIwMDAsImV4cCI6MTcyNTQ1NTYwMH0._TEST
set RESET_URL=%FRONTEND_URL%/reset-password?token=%TEST_TOKEN%

echo Test Payload:
echo   Email: %TEST_EMAIL%
echo   Reset URL: %RESET_URL%
echo.

REM Send test request using curl
echo Sending test password reset email...
echo.

for /f "delims=" %%a in ('curl -s -X POST http://localhost:5000/api/auth/forgot-password -H "Content-Type: application/json" -d "{\"email\": \"%TEST_EMAIL%\"}"') do set RESPONSE=%%a

echo Response:
echo %RESPONSE%
echo.

REM Check if email was sent successfully
echo %RESPONSE% | findstr /C:"emailSent" > nul
if %errorlevel% equ 0 (
    echo ^+ SUCCESS: Password reset email sent!
    echo.
    echo Check your inbox at %TEST_EMAIL% for the test email.
    echo The email should contain:
    echo   - Reset password button
    echo   - 1-hour expiration warning
    echo   - Security information
) else (
    echo ^! WARNING: Email may not have been sent.
    echo Check server logs for error messages.
    echo.
    echo Common issues:
    echo   1. Email service not configured ^(EMAIL_USER/EMAIL_PASSWORD^)
    echo   2. Gmail: App Password incorrect or not generated
    echo   3. Network: SMTP server unreachable
    echo   4. Rate limiting: Too many test emails sent
    echo.
    echo Solutions:
    echo   1. Re-check .env configuration
    echo   2. For Gmail: Use App Password, not regular password
    echo   3. Check firewall/network settings
    echo   4. Wait 1 minute before next test
)

echo.
pause
