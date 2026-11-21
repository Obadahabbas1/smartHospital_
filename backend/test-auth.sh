#!/bin/bash

# ==================== Smart Hospital API - Authentication Testing ====================
# Quick reference for testing authentication endpoints with curl
# Run these commands from terminal to test the API

# Configuration
API_URL="http://localhost:5000/api"
EMAIL="testuser@example.com"
PASSWORD="TestUser@123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Smart Hospital API - Authentication Testing${NC}\n"

# ==================== Test 1: Signup ====================
echo -e "${YELLOW}1. Testing Signup${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'",
    "confirmPassword": "'$PASSWORD'",
    "phone": "9876543210"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$SIGNUP_RESPONSE" | jq '.' || echo "$SIGNUP_RESPONSE"

# Extract tokens
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null || echo "")
REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.refreshToken' 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${YELLOW}Note: User might already exist. Attempting login...${NC}\n"
  
  # ==================== Test 1b: Login ====================
  echo -e "${YELLOW}1b. Testing Login${NC}"
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "'$EMAIL'",
      "password": "'$PASSWORD'"
    }')
  
  echo -e "${GREEN}Response:${NC}"
  echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
  
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null || echo "")
  REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken' 2>/dev/null || echo "")
fi

echo ""

# ==================== Test 2: Get Current User ====================
if [ ! -z "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
  echo -e "${YELLOW}2. Testing Get Current User (Protected Route)${NC}"
  echo -e "${BLUE}Using Access Token: ${ACCESS_TOKEN:0:20}...${NC}\n"
  
  CURRENT_USER=$(curl -s -X GET "$API_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  echo -e "${GREEN}Response:${NC}"
  echo "$CURRENT_USER" | jq '.' || echo "$CURRENT_USER"
  echo ""
  
  # ==================== Test 3: Refresh Token ====================
  if [ ! -z "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    echo -e "${YELLOW}3. Testing Token Refresh${NC}"
    
    REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh-token" \
      -H "Content-Type: application/json" \
      -d '{
        "refreshToken": "'$REFRESH_TOKEN'"
      }')
    
    echo -e "${GREEN}Response:${NC}"
    echo "$REFRESH_RESPONSE" | jq '.' || echo "$REFRESH_RESPONSE"
    
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null || echo "")
    if [ ! -z "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "null" ]; then
      echo -e "${BLUE}New Access Token: ${NEW_ACCESS_TOKEN:0:20}...${NC}"
    fi
    echo ""
  fi
  
  # ==================== Test 4: Logout ====================
  echo -e "${YELLOW}4. Testing Logout${NC}"
  LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  echo -e "${GREEN}Response:${NC}"
  echo "$LOGOUT_RESPONSE" | jq '.' || echo "$LOGOUT_RESPONSE"
  echo ""
else
  echo -e "${YELLOW}Cannot proceed with authenticated tests - no access token available${NC}\n"
fi

# ==================== Test 5: Forgot Password ====================
echo -e "${YELLOW}5. Testing Forgot Password${NC}"
FORGOT_RESPONSE=$(curl -s -X POST "$API_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$FORGOT_RESPONSE" | jq '.' || echo "$FORGOT_RESPONSE"
echo ""

# ==================== Test 6: Invalid Token ====================
echo -e "${YELLOW}6. Testing Invalid Token (Error Scenario)${NC}"
INVALID_TOKEN_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer invalid-token-here")

echo -e "${GREEN}Response:${NC}"
echo "$INVALID_TOKEN_RESPONSE" | jq '.' || echo "$INVALID_TOKEN_RESPONSE"
echo ""

# ==================== Test 7: Missing Authorization Header ====================
echo -e "${YELLOW}7. Testing Missing Authorization Header (Error Scenario)${NC}"
NO_AUTH_RESPONSE=$(curl -s -X GET "$API_URL/auth/me")

echo -e "${GREEN}Response:${NC}"
echo "$NO_AUTH_RESPONSE" | jq '.' || echo "$NO_AUTH_RESPONSE"
echo ""

echo -e "${GREEN}Testing Complete!${NC}"
