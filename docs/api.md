# API Documentation

Base URL: `http://localhost:5000`

## Health

`GET /health`

Returns service health, message, and timestamp.

## Register Company Owner

`POST /api/v1/auth/register`

```json
{
  "email": "owner@example.com",
  "password": "strongpassword123",
  "firstName": "Asha",
  "lastName": "Patel",
  "companyName": "Northstar Retail"
}
```

Creates a tenant company, company owner user, and audit log in one transaction.

## Login

`POST /api/v1/auth/login`

```json
{
  "email": "admin@acme.com",
  "password": "adminpassword123"
}
```

Returns an access token and stores the refresh token in an HTTP-only cookie.

## Refresh

`POST /api/v1/auth/refresh`

Reads refresh token from cookie or request body and returns a new access token.

## Current User

`GET /api/v1/auth/me`

Requires `Authorization: Bearer <accessToken>`.

## Logout

`POST /api/v1/auth/logout`

Requires `Authorization: Bearer <accessToken>`. Removes the active session and clears the refresh cookie.
