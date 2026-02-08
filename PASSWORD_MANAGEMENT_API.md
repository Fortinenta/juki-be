# Password Management API

## Available Endpoints

### 1. Change Password (User Logged In)
**POST** `/api/v1/auth/change-password`

**Auth:** Required (JWT)

**Description:** User yang sudah login bisa ganti password dengan memasukkan password lama

**Request Body:**
```json
{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Validation:**
- `oldPassword`: Required, minimum 6 characters
- `newPassword`: Required, minimum 6 characters

**Response (Success):**
```json
{
  "message": "Password changed successfully"
}
```

**Response (Error - Wrong Old Password):**
```json
{
  "statusCode": 400,
  "message": "Invalid old password",
  "error": "Bad Request"
}
```

**Behavior:**
- ✅ Validasi old password
- ✅ Hash new password dengan bcrypt
- ✅ Update password di database
- ✅ **Revoke semua session** (user harus login ulang)
- ✅ Catat di audit log

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "oldPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }'
```

---

## ⚠️ Missing Feature: Forgot Password / Reset Password

Saat ini **BELUM ADA** endpoint untuk reset password tanpa login (forgot password flow).

### Typical Forgot Password Flow:
```
1. User click "Forgot Password"
2. User enter email
3. System send reset token via email
4. User click link in email
5. User enter new password
6. Password updated
```

### Recommended Implementation:

#### Step 1: Request Reset Token
**POST** `/api/v1/auth/forgot-password`

**Auth:** Public (no login required)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

**Note:** Always return success message even if email doesn't exist (security best practice)

---

#### Step 2: Reset Password with Token
**POST** `/api/v1/auth/reset-password`

**Auth:** Public (no login required)

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. Please login with your new password."
}
```

---

### Implementation Requirements:

1. **Database Schema:**
```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("password_reset_tokens")
}
```

2. **Email Service:**
- Setup email provider (SendGrid, AWS SES, Nodemailer, dll)
- Create email template for reset link
- Send email with reset token

3. **Security Considerations:**
- Token harus random dan secure (crypto.randomBytes)
- Token expire dalam 1 jam
- Token hanya bisa digunakan 1x
- Rate limiting untuk prevent abuse
- Log semua reset attempts

---

## Current Workaround (Without Forgot Password)

Jika user lupa password, admin bisa reset password untuk user:

### Admin Reset User Password
**PATCH** `/api/v1/users/:userId`

**Auth:** Required (JWT) - Admin/Super Admin only

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

**Note:** Ini memerlukan update DTO dan service untuk support password field.

---

## Comparison: Change vs Reset Password

| Feature | Change Password | Forgot/Reset Password |
|---------|----------------|----------------------|
| **Endpoint** | POST /auth/change-password | POST /auth/forgot-password<br>POST /auth/reset-password |
| **Auth Required** | ✅ Yes (JWT) | ❌ No (Public) |
| **Old Password** | ✅ Required | ❌ Not required |
| **Email Verification** | ❌ No | ✅ Yes (via token) |
| **Use Case** | User knows old password | User forgot password |
| **Status** | ✅ Implemented | ❌ Not implemented |

---

## Testing Change Password

### Test Case 1: Success
```bash
# Login first
POST /api/v1/auth/login
Body: { "email": "user@juki.com", "password": "oldpassword123" }
Response: { "accessToken": "...", "refreshToken": "..." }

# Change password
POST /api/v1/auth/change-password
Headers: Authorization: Bearer {accessToken}
Body: { "oldPassword": "oldpassword123", "newPassword": "newpassword123" }
Response: { "message": "Password changed successfully" }

# Try to use old token (should fail - session revoked)
GET /api/v1/flow/my-status
Headers: Authorization: Bearer {old_accessToken}
Response: 401 Unauthorized

# Login with new password
POST /api/v1/auth/login
Body: { "email": "user@juki.com", "password": "newpassword123" }
Response: { "accessToken": "...", "refreshToken": "..." }
```

### Test Case 2: Wrong Old Password
```bash
POST /api/v1/auth/change-password
Headers: Authorization: Bearer {accessToken}
Body: { "oldPassword": "wrongpassword", "newPassword": "newpassword123" }
Response: 400 Bad Request - "Invalid old password"
```

### Test Case 3: Validation Error
```bash
POST /api/v1/auth/change-password
Headers: Authorization: Bearer {accessToken}
Body: { "oldPassword": "old", "newPassword": "new" }
Response: 400 Bad Request - "oldPassword must be longer than or equal to 6 characters"
```

---

## Security Best Practices

### Current Implementation (Change Password):
- ✅ Requires old password verification
- ✅ Password hashed with bcrypt (salt rounds: 10)
- ✅ All sessions revoked after password change
- ✅ Audit log created
- ✅ Minimum password length: 6 characters

### Recommendations:
1. ✅ Increase minimum password length to 8 characters
2. ✅ Add password complexity requirements (uppercase, lowercase, number, special char)
3. ✅ Implement rate limiting (max 5 attempts per hour)
4. ✅ Add password history (prevent reusing last 3 passwords)
5. ✅ Implement forgot password flow
6. ✅ Add 2FA (Two-Factor Authentication)

---

## Admin Actions

### Admin Can Reset User Password (via Update User)

Currently, admin can update user data via:
```
PATCH /api/v1/users/:userId
```

To support password reset by admin, add to `UpdateUserDto`:

```typescript
@IsOptional()
@IsString()
@MinLength(8)
password?: string;
```

Then in service:
```typescript
if (dto.password) {
  userUpdate.password = await bcrypt.hash(dto.password, 10);
}
```

**Use Case:**
- User lupa password dan tidak ada forgot password flow
- User contact admin via WhatsApp/Email
- Admin verify identity
- Admin reset password manually
- Admin inform new password to user (via secure channel)

---

## Summary

### ✅ Available Now:
- **Change Password** - User yang sudah login bisa ganti password

### ❌ Not Available (Need Implementation):
- **Forgot Password** - User yang lupa password tidak bisa reset sendiri
- **Admin Reset Password** - Admin tidak bisa reset password user via UI

### 🔧 Workaround:
- Admin bisa update password via database directly
- Or implement admin reset password via PATCH /users/:userId

### 📋 Recommendation:
Implement forgot password flow untuk better UX dan security.

---

**Last Updated:** February 8, 2026  
**Version:** 1.0
