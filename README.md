# JUKI Backend API

A secure and scalable NestJS backend API with JWT authentication, role-based access control, and comprehensive audit logging.

## Features

- 🔐 **JWT Authentication** - Access and refresh token system
- 👥 **User Management** - Complete CRUD operations for users
- 📝 **Profile Management** - User profiles with customizable fields
- 🔒 **Session Management** - Track and manage user sessions
- 📊 **Audit Logging** - Comprehensive activity tracking
- 🛡️ **Security** - Helmet, CORS, rate limiting, and input validation
- 🎯 **Role-Based Access Control** - USER, ADMIN, SUPER_ADMIN roles
- 🗄️ **Database** - PostgreSQL with Prisma ORM
- ✅ **Validation** - Request validation with class-validator
- 🚀 **Performance** - Request compression and optimization

## Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: class-validator & class-transformer
- **Security**: Helmet, bcrypt, Throttler
- **Language**: TypeScript

## Prerequisites

- Node.js >= 18
- pnpm (recommended) or npm
- PostgreSQL >= 14

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd juki-be
```

2. Install dependencies:

```bash
pnpm install
```

3. Setup environment variables:

```bash
cp .env.example .env
```

Edit `.env` and configure your database and JWT secrets:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/juki_db"
JWT_ACCESS_SECRET=your-secure-access-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
```

4. Run database migrations:

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

## Running the Application

### Development

```bash
pnpm start:dev
```

### Production

```bash
pnpm build
pnpm start:prod
```

### Database Management

```bash
# Open Prisma Studio
pnpm prisma:studio

# Create migration
pnpm prisma:migrate

# Generate Prisma Client
pnpm prisma:generate
```

## API Documentation

Base URL: `http://localhost:3000/api/v1`

### Authentication Endpoints

#### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "status": "ACTIVE"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer <access-token>
```

#### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Change Password

```http
POST /api/v1/auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### User Management Endpoints

#### List Users (Admin only)

```http
GET /api/v1/users?page=1&limit=10&search=john&role=USER&status=ACTIVE
Authorization: Bearer <access-token>
```

#### Get User Stats (Admin only)

```http
GET /api/v1/users/stats
Authorization: Bearer <access-token>
```

#### Get User by ID

```http
GET /api/v1/users/:id
Authorization: Bearer <access-token>
```

#### Update User

```http
PATCH /api/v1/users/:id
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "role": "ADMIN",
  "status": "ACTIVE"
}
```

#### Delete User (Admin only)

```http
DELETE /api/v1/users/:id
Authorization: Bearer <access-token>
```

### Profile Management Endpoints

#### Get My Profile

```http
GET /api/v1/profiles/me
Authorization: Bearer <access-token>
```

#### Get Profile by User ID

```http
GET /api/v1/profiles/:userId
Authorization: Bearer <access-token>
```

#### Update Profile

```http
PATCH /api/v1/profiles/:userId
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "bio": "Software Developer",
  "dateOfBirth": "1990-01-01"
}
```

#### Delete Avatar

```http
DELETE /api/v1/profiles/:userId/avatar
Authorization: Bearer <access-token>
```

### Session Management Endpoints

#### Get My Sessions

```http
GET /api/v1/sessions/me
Authorization: Bearer <access-token>
```

#### Get User Sessions

```http
GET /api/v1/sessions/user/:userId
Authorization: Bearer <access-token>
```

#### Revoke Session

```http
DELETE /api/v1/sessions/:sessionId/user/:userId
Authorization: Bearer <access-token>
```

#### Revoke All Sessions

```http
DELETE /api/v1/sessions/user/:userId/all
Authorization: Bearer <access-token>
```

#### Cleanup Expired Sessions (Admin only)

```http
DELETE /api/v1/sessions/cleanup
Authorization: Bearer <access-token>
```

### Audit Logs Endpoints

#### Get All Audit Logs (Admin only)

```http
GET /api/v1/audit-logs?page=1&limit=10&userId=uuid&action=LOGIN
Authorization: Bearer <access-token>
```

#### Get Audit Log Stats (Admin only)

```http
GET /api/v1/audit-logs/stats
Authorization: Bearer <access-token>
```

#### Get My Audit Logs

```http
GET /api/v1/audit-logs/me
Authorization: Bearer <access-token>
```

#### Get User Audit Logs

```http
GET /api/v1/audit-logs/user/:userId
Authorization: Bearer <access-token>
```

## Security Features

### 1. Password Security

- Passwords are hashed using bcrypt with configurable rounds
- Minimum password length: 8 characters
- Password validation on registration and change

### 2. JWT Security

- Separate access and refresh tokens
- Access token: Short-lived (15 minutes default)
- Refresh token: Long-lived (7 days default)
- Tokens stored securely in database

### 3. Session Management

- Track user sessions with IP and user agent
- Ability to revoke individual or all sessions
- Automatic cleanup of expired sessions

### 4. Rate Limiting

- Configurable rate limits (100 requests per 60 seconds default)
- Prevents brute force attacks
- Per-IP rate limiting

### 5. Input Validation

- All inputs validated using class-validator
- Automatic sanitization of user inputs
- Protection against injection attacks

### 6. CORS & Helmet

- CORS configured for specific origins
- Helmet middleware for security headers
- Protection against common vulnerabilities

### 7. Role-Based Access Control

- Three user roles: USER, ADMIN, SUPER_ADMIN
- Endpoint-level access control
- Resource-level permissions

### 8. Audit Logging

- All authentication actions logged
- User activity tracking
- IP address and user agent recording

## Database Schema

### Users

- id (UUID)
- email (unique)
- password (hashed)
- role (USER | ADMIN | SUPER_ADMIN)
- status (ACTIVE | INACTIVE | SUSPENDED | DELETED)
- timestamps

### Profiles

- id (UUID)
- userId (foreign key)
- firstName, lastName
- phoneNumber
- avatar
- bio
- dateOfBirth
- timestamps

### Sessions

- id (UUID)
- userId (foreign key)
- refreshToken (unique)
- userAgent
- ipAddress
- expiresAt
- timestamps

### AuditLogs

- id (UUID)
- userId (foreign key)
- action (enum)
- metadata (JSON)
- ipAddress
- userAgent
- timestamp

## Environment Variables

```env
# Application
APP_NAME=JUKI
APP_ENV=development
APP_PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/juki_db

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## Project Structure

```
src/
├── common/
│   ├── filters/          # Exception filters
│   ├── interceptors/     # Request/response interceptors
│   └── pipes/           # Validation pipes
├── config/
│   └── app.config.ts    # Application configuration
├── modules/
│   ├── auth/            # Authentication module
│   ├── users/           # User management
│   ├── profiles/        # Profile management
│   ├── sessions/        # Session management
│   └── audit-logs/      # Audit logging
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Best Practices

1. **Always use environment variables** for sensitive data
2. **Never commit `.env` files** to version control
3. **Use strong JWT secrets** in production
4. **Enable HTTPS** in production
5. **Regularly rotate JWT secrets**
6. **Monitor audit logs** for suspicious activity
7. **Keep dependencies updated**
8. **Use prepared statements** (Prisma handles this)
9. **Implement rate limiting** on all endpoints
10. **Regular database backups**

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@juki.com or open an issue in the repository.
