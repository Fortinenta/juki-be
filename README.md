# JUKI Backend API

A secure, scalable, and state-machine-driven NestJS backend API for managing student training and journal publications.

## 🚀 Key Features

- 🔐 **JWT Authentication** - Robust access and refresh token system.
- 🎯 **Role-Based Access Control (RBAC)** - `USER`, `ADMIN`, and `SUPER_ADMIN` roles.
- 🔄 **Training Flow Engine** - Automated state-machine to track student progress from payment to LoA publication.
- 📁 **File Management** - Secure upload system for payment proofs, KTM, and articles.
- 👥 **User & Profile Management** - Comprehensive data handling with validation.
- 🔒 **Session Management** - Track, manage, and revoke active user sessions.
- 📊 **Audit Logging** - Detailed activity tracking for security and accountability.
- 🛡️ **Security First** - Helmet, CORS, rate limiting, and Bcrypt password hashing.
- ✅ **Validation** - Strict input validation using `class-validator`.
- 🗄️ **Database** - PostgreSQL with Prisma ORM for type-safe database access.

## 🛠️ Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Passport-JWT
- **Security**: Helmet, Express-Compression, Throttler
- **Documentation**: Postman (Collection provided)

## 📋 Prerequisites

- Node.js >= 18
- pnpm (recommended) or npm
- PostgreSQL >= 14

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd juki
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.

4. **Initialize Database**:
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev --name init
   ```

5. **Seed Initial Data**:
   ```bash
   npx prisma db seed
   ```
   *This creates default accounts and required training status lookups.*

## 🏃 Running the App

- **Development**: `pnpm start:dev`
- **Production**: `pnpm build && pnpm start:prod`
- **Health Check**: `GET http://localhost:3000/api/v1/health`

## 🌊 Training Flow Workflow

The system manages student progress through these sequential steps:

1. **PAYMENT_REQUIRED** ➡️ Upload payment proof.
2. **PAYMENT_WAITING** ➡️ Admin verifies payment.
3. **ADMINISTRATIVE_REQUIRED** ➡️ Complete profile & KTM.
4. **ARTICLE_WAITING** ➡️ Upload research article.
5. **TRAINING_WAITING** ➡️ Attend training sessions.
6. **REVIEW_WAITING** ➡️ Article review process.
7. **LOA_WAITING** ➡️ Waiting for Letter of Acceptance.
8. **LOA_PUBLISHED** 🏁 Completed.

## 📡 API Endpoints Summary

### Authentication
- `POST /auth/register` - Create new student account.
- `POST /auth/login` - Get access & refresh tokens.
- `POST /auth/refresh` - Refresh expired access token.
- `POST /auth/logout` - Revoke current session.

### Profiles & Users
- `GET /profiles/me` - Get current user profile and flow status.
- `PUT /profiles/me` - Update personal info.
- `GET /users` - (Admin) List all users with filters.

### Training Flow (User)
- `POST /payments/upload` - Upload payment receipt.
- `POST /articles/upload` - Upload research article.

### Admin Flow Control
- `POST /admin/payments/:userId/verify` - Confirm student payment.
- `POST /admin/administrative/:userId/complete` - Verify administrative data.
- `POST /admin/articles/:userId/verify` - Confirm article submission.
- `POST /admin/review-loa/:userId/review/accept` - Approve article review.
- `POST /admin/review-loa/:userId/loa/upload` - Upload final LoA for student.

### System Audit & Sessions
- `GET /audit-logs/me` - View personal activity history.
- `GET /sessions/me` - List active devices/sessions.

## 🔐 Default Accounts (After Seeding)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@juki.com` | `SuperAdmin123!` |
| **Admin** | `admin@juki.com` | `Admin123!` |
| **User** | `user@juki.com` | `User123!` |

## 🧪 Testing

```bash
# Unit Tests
pnpm test

# E2E Tests
pnpm test:e2e
```

## 📂 Project Structure

- `src/modules` - Core business logic (Auth, Users, Training Flow, etc.)
- `src/common` - Global filters, guards, interceptors, and pipes.
- `src/health` - System health check endpoint.
- `prisma/` - Database schema, migrations, and seed scripts.
- `uploads/` - Local storage for uploaded files (Payment, Article, LoA).

## 📄 License

Licensed under the [MIT License](LICENSE).
