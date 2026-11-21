/**
 * JWT Configuration and Token Flow Documentation
 * ===============================================
 *
 * OVERVIEW:
 * This application uses JSON Web Tokens (JWT) for stateless user authentication.
 * Tokens are cryptographically signed and contain encoded user information.
 * No session storage is required on the server.
 */

// ==================== Configuration Values ====================
export const jwtConfig = {
  // Access Token - Short-lived token for API requests
  accessToken: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d', // 7 days
    algorithm: 'HS256', // HMAC SHA256
    issuer: 'smart-hospital-api',
  },

  // Refresh Token - Long-lived token for obtaining new access tokens
  refreshToken: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d', // 30 days
    algorithm: 'HS256',
    issuer: 'smart-hospital-api',
  },

  // Password Reset Token - Short-lived token for password reset
  resetToken: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: '1h', // 1 hour - security: short expiration
    algorithm: 'HS256',
    issuer: 'smart-hospital-api',
  },
};

/**
 * ==================== TOKEN FLOW DOCUMENTATION ====================
 *
 * STANDARD AUTHENTICATION FLOW:
 * =============================
 *
 * 1. USER SIGNUP (Registration)
 *    ├─ Client: Sends POST /api/auth/signup
 *    │  └─ Body: {firstName, lastName, email, password, phone}
 *    ├─ Server: Validates input
 *    ├─ Server: Checks if email already exists
 *    ├─ Server: Creates User with hashed password (bcryptjs)
 *    ├─ Server: Generates tokens
 *    │  ├─ accessToken: Valid for 7 days (short-lived)
 *    │  └─ refreshToken: Valid for 30 days (long-lived)
 *    └─ Server: Returns 201 with tokens and user data
 *
 *    Response Example:
 *    {
 *      "status": "success",
 *      "data": {
 *        "userId": "507f1f77bcf86cd799439011",
 *        "email": "user@example.com",
 *        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *        "expiresIn": "7d",
 *        "tokenType": "Bearer"
 *      }
 *    }
 *
 *
 * 2. USER LOGIN (Authentication)
 *    ├─ Client: Sends POST /api/auth/login
 *    │  └─ Body: {email, password, rememberMe?}
 *    ├─ Server: Looks up user by email (case-insensitive)
 *    ├─ Server: Checks account status (active, not locked)
 *    ├─ Server: Compares provided password with stored hash using bcryptjs
 *    ├─ Server: On wrong password:
 *    │  ├─ Increments failed login attempts (max 5)
 *    │  ├─ Locks account for 30 minutes after 5 failures
 *    │  └─ Returns 401 error
 *    ├─ Server: On success, resets failed attempts:
 *    ├─ Server: Generates new access & refresh tokens
 *    └─ Server: Returns 200 with tokens
 *
 *    Error Scenarios:
 *    - Invalid email/password: 401 Unauthorized
 *    - Too many failed attempts: 429 Too Many Requests (account locked)
 *    - Account inactive: 403 Forbidden
 *
 *
 * 3. ACCESSING PROTECTED RESOURCES
 *    ├─ Client: Stores accessToken in memory or secure storage
 *    ├─ Client: Adds Authorization header with token:
 *    │  ├─ Format: "Authorization: Bearer <accessToken>"
 *    ├─ Server: Receives request with header
 *    ├─ Server: authenticate middleware:
 *    │  ├─ Extracts token from "Bearer <token>"
 *    │  ├─ Verifies signature using JWT_SECRET
 *    │  ├─ Checks token expiration
 *    │  ├─ Decodes token to get userId, email, role, type
 *    │  └─ Attaches user info to req.user and req.userId
 *    ├─ Server: Route handler accesses req.user
 *    └─ Server: Returns protected resource or 401 if invalid
 *
 *    Example Protected Endpoint:
 *    GET /api/auth/me
 *    Headers: {
 *      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *      "Content-Type": "application/json"
 *    }
 *
 *
 * 4. TOKEN REFRESH (When access token expires)
 *    ├─ Client: Detects API returns 401 with "TOKEN_EXPIRED"
 *    ├─ Client: Sends POST /api/auth/refresh-token
 *    │  └─ Body: {refreshToken}
 *    ├─ Server: Verifies refreshToken signature
 *    ├─ Server: Checks if token type is "refresh"
 *    ├─ Server: Verifies user still exists and is active
 *    ├─ Server: Generates new accessToken (same 7 day expiration)
 *    ├─ Server: Returns new accessToken
 *    └─ Client: Updates stored token and retries original request
 *
 *    Lifecycle Example:
 *    Time 0h:     Login → accessToken (expires 7 days), refreshToken (expires 30 days)
 *    Time 6.9d:   accessToken used successfully
 *    Time 7.1d:   accessToken EXPIRES
 *    Time 7.1d:   API call returns 401 TOKEN_EXPIRED
 *    Time 7.1d:   Client calls refresh-token with refreshToken
 *    Time 7.1d:   Server returns new accessToken (expires 7 days from now)
 *    Time 7.1d:   Client retries original request WITH new token → SUCCESS
 *    Time 30.1d:  refreshToken EXPIRES → User must login again
 *
 *
 * 5. FORGOT PASSWORD FLOW
 *    ├─ Client: Sends POST /api/auth/forgot-password
 *    │  └─ Body: {email}
 *    ├─ Server: Looks up user by email
 *    ├─ Server: Creates a 1-hour password reset token
 *    ├─ Server: Stores token hash in database
 *    ├─ Server: [In production] Sends email with reset link
 *    │  └─ Link: https://app.com/reset-password?token=<resetToken>
 *    └─ Server: Returns 200 success (doesn't reveal if email exists - security)
 *
 *    User receives email with reset link → clicks → navigates to reset page
 *
 *
 * 6. RESET PASSWORD (Using token from email)
 *    ├─ Client: User clicks link from email
 *    ├─ Client: Navigates to /reset-password?token=<resetToken>
 *    ├─ Client: User enters new password (validates locally)
 *    ├─ Client: Sends POST /api/auth/reset-password
 *    │  └─ Body: {token, newPassword, confirmPassword}
 *    ├─ Server: Verifies token is valid and not expired
 *    ├─ Server: Checks token type is "password-reset"
 *    ├─ Server: Verifies token matches what's in database
 *    ├─ Server: Updates user password (triggers hashing)
 *    ├─ Server: Clears reset token from database
 *    ├─ Server: Resets failed login attempts
 *    └─ Server: Returns 200 success → User can login with new password
 *
 *
 * 7. LOGOUT (Optional - mostly client-side)
 *    ├─ Client: Sends POST /api/auth/logout
 *    │  └─ Header: "Authorization: Bearer <accessToken>"
 *    ├─ Server: [Optional] Adds token to blacklist (for sessions)
 *    ├─ Server: [Optional] Updates lastLogout timestamp
 *    └─ Server: Returns 200 success
 *    └─ Client: Removes token from storage locally
 *
 *    Note: In stateless JWT, server doesn't need to do anything.
 *    Token remains valid until it expires. This endpoint is mainly
 *    for audit logging and optional blacklist implementation.
 *
 *
 * ==================== TOKEN STRUCTURE ====================
 *
 * JWT tokens are composed of 3 parts separated by dots (.):
 * header.payload.signature
 *
 * Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2OTI1MjEyNDcsImV4cCI6MTY5OTE4Mzc0N30.PzXQZGlGf0M5X-Zx_Z7v5..
 *
 *
 * 1. HEADER (Base64URL encoded)
 *    {
 *      "alg": "HS256",      // Algorithm: HMAC SHA256
 *      "typ": "JWT"         // Type: JSON Web Token
 *    }
 *
 *
 * 2. PAYLOAD (Base64URL encoded) - Contains claims
 *    Access Token:
 *    {
 *      "userId": "507f1f77bcf86cd799439011",  // User ID
 *      "email": "user@example.com",            // User email
 *      "role": "user",                         // User role (user/admin/hospital-staff)
 *      "type": "access",                       // Token type
 *      "iss": "smart-hospital-api",            // Issuer
 *      "iat": 1692521247,                      // Issued at (timestamp)
 *      "exp": 1693183747                       // Expiration (timestamp)
 *    }
 *
 *    Refresh Token:
 *    {
 *      "userId": "507f1f77bcf86cd799439011",
 *      "type": "refresh",
 *      "iss": "smart-hospital-api",
 *      "iat": 1692521247,
 *      "exp": 1695199247                       // 30 days from now
 *    }
 *
 *    Reset Token:
 *    {
 *      "userId": "507f1f77bcf86cd799439011",
 *      "type": "password-reset",
 *      "iss": "smart-hospital-api",
 *      "iat": 1692521247,
 *      "exp": 1692524847                       // 1 hour from now
 *    }
 *
 *
 * 3. SIGNATURE (HMAC SHA256)
 *    HMACSHA256(
 *      base64UrlEncode(header) + "." + base64UrlEncode(payload),
 *      JWT_SECRET
 *    )
 *
 *    Used to verify token hasn't been tampered with.
 *    Only server with JWT_SECRET can create valid signatures.
 *
 *
 * ==================== SECURITY BEST PRACTICES ====================
 *
 * 1. TOKEN STORAGE (Frontend):
 *    ├─ ✅ Memory (best during session, but lost on refresh)
 *    ├─ ✅ sessionStorage (cleared when tab closes)
 *    ├─ ⚠️  localStorage (vulnerable to XSS - needs CSP)
 *    ├─ ✅ HttpOnly Cookies (immune to XSS, but needs CSRF protection)
 *    └─ ❌ Regular Cookies (visible to scripts)
 *
 *    Recommended: Memory + localStorage/sessionStorage as fallback
 *
 *
 * 2. TOKEN TRANSMISSION:
 *    ✅ Always use HTTPS (encrypts tokens in transit)
 *    ✅ Use Bearer scheme in Authorization header
 *    ✅ Never send tokens in URL query parameters
 *    ❌ Never send tokens in request body (unless POST to /auth endpoints)
 *
 *
 * 3. SECRET MANAGEMENT:
 *    ✅ Use strong random secrets (min 32 characters)
 *    ✅ Store in environment variables (.env file)
 *    ✅ Never commit .env to version control
 *    ✅ Rotate secrets periodically
 *    ✅ Different secrets for different environments
 *
 *
 * 4. EXPIRATION:
 *    ✅ Access tokens: Short-lived (hours to days) - 7 days here
 *    ✅ Refresh tokens: Longer (weeks to months) - 30 days here
 *    ✅ Reset tokens: Very short (minutes to hours) - 1 hour here
 *
 *
 * 5. ACCOUNT SECURITY:
 *    ✅ Strong password requirements (enforced)
 *    ✅ Password hashing with bcryptjs (10 salt rounds)
 *    ✅ Brute force protection (lock after 5 failed attempts)
 *    ✅ Rate limiting (5 requests per 15 minutes for auth endpoints)
 *    ✅ Failed login attempt tracking
 *
 *
 * 6. VERIFICATION:
 *    ✅ Always verify token signature before processing
 *    ✅ Check token type matches expected type (access, refresh, reset)
 *    ✅ Verify user still exists and is active
 *    ✅ Check token hasn't been blacklisted (if implemented)
 *
 *
 * ==================== ERROR HANDLING ====================
 *
 * 400 Bad Request:
 * - Missing required fields
 * - Invalid email format
 * - Password doesn't meet requirements
 * - Passwords don't match
 *
 * 401 Unauthorized:
 * - Invalid email/password combination
 * - Invalid or expired token
 * - Wrong token type
 * - Token signature invalid
 *
 * 403 Forbidden:
 * - Account is inactive/deactivated
 * - User doesn't have required role
 *
 * 409 Conflict:
 * - Email already registered
 *
 * 429 Too Many Requests:
 * - Rate limit exceeded
 * - Account locked due to failed attempts
 *
 * 500 Internal Server Error:
 * - Database errors
 * - Email sending failures
 * - Unexpected runtime errors
 *
 *
 * ==================== ENVIRONMENT VARIABLES ====================
 *
 * Required .env variables:
 * JWT_SECRET=your-super-secret-key-use-at-least-32-chars
 * JWT_EXPIRATION=7d
 * REFRESH_TOKEN_EXPIRATION=30d
 * NODE_ENV=development
 * PORT=5000
 * MONGODB_URI=mongodb://localhost:27017/smart-hospital
 * CORS_ORIGIN=http://localhost:5173
 *
 * Optional but recommended:
 * EMAIL_SERVICE=gmail
 * EMAIL_USER=your-email@gmail.com
 * EMAIL_PASSWORD=your-app-password
 * FRONTEND_URL=http://localhost:5173
 *
 */

export default jwtConfig;
