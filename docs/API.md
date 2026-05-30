# API Documentation - Personality Tests API

## Base URL
```
Production: https://api.yourdomain.com/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication
All protected endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/register
Register a new user (or upgrade from guest).

**Request:**
```json
{
  "fullName": "علی سیراجی",
  "email": "ali@example.com",
  "password": "SecurePass123",
  "guestToken": "gt_xxx (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ثبت‌نام با موفقیت انجام شد",
  "data": {
    "id": "user_id",
    "fullName": "علی سیراجی",
    "email": "ali@example.com",
    "role": "user",
    "token": "jwt_token"
  }
}
```

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "ali@example.com",
  "password": "SecurePass123"
}
```

### POST /auth/guest
Create a guest account for testing without registration.

---

## Test Endpoints

### GET /tests
List all active tests with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

### GET /tests/:slug
Get single test by slug.

### GET /tests/:slug/questions
Get questions for a test with pagination.

**Query Parameters:**
- `lang` (fa/en, default: fa)
- `page` (default: 1)
- `limit` (default: 50)

### POST /tests/:slug/session
Create a new test session (or resume existing).

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_id",
    "resumed": true
  }
}
```

### POST /tests/:slug/answers
Submit answers for a test session.

**Request:**
```json
{
  "sessionId": "session_id",
  "answers": [
    { "questionId": "q1", "answer": 4 },
    { "questionId": "q2", "answer": 2 }
  ]
}
```

### GET /tests/:slug/session/:sessionId
Get session details and progress.

---

## Result Endpoints

### GET /results/:slug/result/:sessionId
Get calculated results for a completed test session.

### GET /results/my
Get all results for current user.

**Query Parameters:**
- `testSlug` (optional)
- `page` (default: 1)
- `limit` (default: 10)

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /auth/* | 10 requests/15min |
| /tests/* | 100 requests/15min |
| /results/* | 30 requests/15min |

---

## Error Responses

```json
{
  "success": false,
  "message": "خطای سرور",
  "errors": ["array of errors (optional)"]
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid/expired token |
| 403 | Forbidden - No permission |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |