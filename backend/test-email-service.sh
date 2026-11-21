#!/bin/bash

# Test Email Service Configuration
# This script tests the email service by sending a test email

echo "=========================================="
echo "Smart Hospital - Email Service Test"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please run setup-email-service.sh first"
    exit 1
fi

# Check required environment variables
echo "Checking environment variables..."
EMAIL_USER=$(grep "^EMAIL_USER=" .env | cut -d '=' -f 2)
EMAIL_PASSWORD=$(grep "^EMAIL_PASSWORD=" .env | cut -d '=' -f 2)
EMAIL_SERVICE=$(grep "^EMAIL_SERVICE=" .env | cut -d '=' -f 2)
FRONTEND_URL=$(grep "^FRONTEND_URL=" .env | cut -d '=' -f 2)

if [ -z "$EMAIL_USER" ] || [ -z "$EMAIL_PASSWORD" ]; then
    echo "❌ ERROR: EMAIL_USER or EMAIL_PASSWORD not set in .env"
    echo "Please configure email credentials first"
    exit 1
fi

echo "✓ EMAIL_USER: $EMAIL_USER"
echo "✓ EMAIL_SERVICE: ${EMAIL_SERVICE:-'gmail'}"
echo "✓ FRONTEND_URL: ${FRONTEND_URL:-'http://localhost:5173'}"
echo ""

# Create test payload
TEST_EMAIL=${EMAIL_USER}
TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmQ0ZWE2YTBkOWE0ZDBhMDEyMzQ1NjciLCJ0eXBlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE3MjU0NTIwMDAsImV4cCI6MTcyNTQ1NTYwMH0._TEST"
RESET_URL="${FRONTEND_URL:-'http://localhost:5173'}/reset-password?token=${TEST_TOKEN}"

echo "Test Payload:"
echo "  Email: $TEST_EMAIL"
echo "  Reset URL: $RESET_URL"
echo ""

# Send test request using curl
echo "Sending test password reset email..."
echo ""

RESPONSE=$(curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}" \
  2>/dev/null)

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if email was sent successfully
if echo "$RESPONSE" | grep -q '"emailSent":true'; then
    echo "✅ SUCCESS: Password reset email sent!"
    echo ""
    echo "Check your inbox at $TEST_EMAIL for the test email."
    echo "The email should contain:"
    echo "  - Reset password button"
    echo "  - 1-hour expiration warning"
    echo "  - Security information"
else
    echo "⚠️  WARNING: Email may not have been sent."
    echo "Check server logs for error messages."
    echo ""
    echo "Common issues:"
    echo "  1. Email service not configured (EMAIL_USER/EMAIL_PASSWORD)"
    echo "  2. Gmail: App Password incorrect or not generated"
    echo "  3. Network: SMTP server unreachable"
    echo "  4. Rate limiting: Too many test emails sent"
    echo ""
    echo "Solutions:"
    echo "  1. Re-check .env configuration"
    echo "  2. For Gmail: Use App Password, not regular password"
    echo "  3. Check firewall/network settings"
    echo "  4. Wait 1 minute before next test"
fi

echo ""
