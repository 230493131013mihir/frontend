# Database Documentation

The Phase 1 schema is intentionally small and normalized so later ERP modules can attach to tenant-owned companies.

## Models

- `Company`: tenant record with name, optional domain, optional logo, users, and timestamps.
- `User`: authenticated user with email, password hash, role, verification flags, company relation, sessions, and audit logs.
- `Session`: persisted access-token session with expiry, user agent, and IP metadata.
- `AuditLog`: security and operational event trail.

## Roles

`SUPER_ADMIN`, `COMPANY_OWNER`, `MANAGER`, `EMPLOYEE`, `CUSTOMER`, `VENDOR`, `HR`, `ACCOUNTANT`, `SALES_EXECUTIVE`, `SUPPORT_EXECUTIVE`

## Indexes

- `User.email`
- `User.companyId`
- `Session.userId`
- `Session.token`
- `AuditLog.userId`

## ER Diagram

```mermaid
erDiagram
  COMPANY ||--o{ USER : owns
  USER ||--o{ SESSION : creates
  USER ||--o{ AUDIT_LOG : records

  COMPANY {
    string id
    string name
    string domain
    string logo
    datetime createdAt
    datetime updatedAt
  }

  USER {
    string id
    string email
    string password
    string firstName
    string lastName
    Role role
    string companyId
    boolean isVerified
    boolean twoFactorEnabled
    datetime createdAt
    datetime updatedAt
  }

  SESSION {
    string id
    string userId
    string token
    datetime expiresAt
    string userAgent
    string ipAddress
    datetime createdAt
  }

  AUDIT_LOG {
    string id
    string userId
    string action
    string details
    string ipAddress
    datetime createdAt
  }
```
