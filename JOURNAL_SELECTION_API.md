# Journal Selection & Training Filtering API

## Overview
Sistem sekarang mendukung 3 kelompok jurnal yang sudah ditetapkan:
- **JIE** - Journal of Industrial Engineering
- **JOEFI** - Journal of Economics and Finance
- **JOESMENT** - Journal of Education and Management

**PENTING:** Pemilihan kelompok jurnal dilakukan oleh **ADMIN**, bukan oleh user biasa.

## Flow
1. User menyelesaikan pembayaran (PAYMENT_VERIFIED)
2. User memulai tahap administratif (ADMINISTRATIVE_REQUIRED)
3. User mengisi form administratif dan konfirmasi (WAITING_ADMINISTRATIVE)
4. **Admin verifikasi data administratif dan SET KELOMPOK JURNAL untuk user**
5. Admin membuat OJS account (otomatis set journal jika belum di-set sebelumnya)
6. User upload artikel (ARTICLE_WAITING)
7. Admin verifikasi artikel (ARTICLE_VERIFIED)
8. User melihat jadwal pelatihan yang sudah difilter sesuai kelompok jurnalnya
9. User memilih jadwal pelatihan (harus sesuai dengan journalCode yang sudah di-set admin)

## Important Notes
- ❌ User TIDAK BISA memilih journal sendiri
- ✅ Admin yang menentukan kelompok jurnal untuk setiap user
- ✅ Admin bisa set journal code kapan saja sebelum user memilih training
- ✅ Admin bisa set journal code saat membuat OJS account
- ❌ Admin tidak bisa ganti journal setelah user memilih training schedule

---

## User Endpoints

### 1. Get Available Journals
**GET** `/api/v1/administrative/journals`

**Auth:** Required (JWT)

**Description:** User bisa melihat daftar journal yang tersedia (untuk informasi saja, tidak bisa memilih sendiri)

**Response:**
```json
[
  {
    "code": "JIE",
    "name": "Journal of Industrial Engineering",
    "isActive": true
  },
  {
    "code": "JOEFI",
    "name": "Journal of Economics and Finance",
    "isActive": true
  },
  {
    "code": "JOESMENT",
    "name": "Journal of Education and Management",
    "isActive": true
  }
]
```

### 2. Confirm Administrative
**POST** `/api/v1/administrative/confirm`

**Auth:** Required (JWT)

**Flow Status Required:** ADMINISTRATIVE_REQUIRED

**Body:** None

**Response:**
```json
{
  "message": "Administrative form submission confirmed. Waiting for admin verification.",
  "journalSelected": false,
  "journalCode": null
}
```

**Note:** User hanya konfirmasi sudah mengisi form. Admin yang akan set journal code nanti.

### 3. Get Available Trainings
**GET** `/api/v1/trainings`

**Auth:** Optional (Endpoint public, tapi akan auto-filter jika user login)

**Behavior:**
- **Jika user TIDAK login:** Menampilkan semua jadwal pelatihan yang tersedia (future & quota > 0)
- **Jika user SUDAH login DAN admin sudah set journal:** Hanya menampilkan jadwal sesuai journalCode user
- **Jika user SUDAH login TAPI admin belum set journal:** Menampilkan semua jadwal

**Headers (Optional):**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "batch": "BATCH-JIE-TODAY",
    "title": "Pelatihan Jurnal JIE (Hari Ini - Nanti Sore)",
    "startAt": "2026-02-08T17:00:00.000Z",
    "endAt": "2026-02-08T20:00:00.000Z",
    "location": "Google Meet",
    "journalCode": "JIE",
    "mentorName": "Prof. X",
    "quota": 50,
    "createdAt": "2026-02-08T12:00:00.000Z"
  }
]
```

### 4. Select Training Schedule
**POST** `/api/v1/trainings/:id/select`

**Auth:** Required (JWT)

**Flow Status Required:** ARTICLE_VERIFIED (or TRAINING_RESCHEDULE)

**Params:**
- `id`: Training ID

**Body:** None

**Response:**
```json
{
  "userId": "user-uuid",
  "statusCode": "TRAINING_WAITING",
  "trainingId": "training-uuid",
  "journalCode": "JIE",
  "version": 2,
  "updatedAt": "2026-02-08T14:00:00.000Z"
}
```

**Errors:**
- 400: Please select a journal group first before choosing a training schedule (admin belum set journal)
- 400: This training is for JOEFI journal group. You are registered for JIE
- 400: You are not eligible to select a training schedule at this stage
- 409: You have already selected a training schedule
- 409: This training batch is full
- 404: Training schedule not found

**Validation:**
- Admin MUST set journal for user before user can select training
- Training journalCode MUST match user's journalCode
- Training must be in the future
- Training must have available quota

---

## Admin Endpoints

### 1. Set Journal Code for User
**POST** `/api/v1/admin/administrative/:userId/set-journal`

**Auth:** Required (JWT) - Admin/Super Admin only

**Params:**
- `userId`: User ID

**Body:**
```json
{
  "journalCode": "JIE"
}
```

**Response:**
```json
{
  "message": "Journal code set successfully",
  "journalCode": "JIE",
  "journalName": "Journal of Industrial Engineering",
  "setBy": "admin"
}
```

**Errors:**
- 400: Invalid journal code. Must be one of: JIE, JOEFI, JOESMENT
- 400: Journal not found or inactive
- 400: Cannot change journal group after user has selected a training schedule

**Note:** Admin bisa set journal code kapan saja sebelum user memilih training.

### 2. Create OJS Account (Auto Set Journal)
**POST** `/api/v1/admin/administrative/:userId/ojs`

**Auth:** Required (JWT) - Admin/Super Admin only

**Params:**
- `userId`: User ID

**Body:**
```json
{
  "username": "user123",
  "password": "password123",
  "journalCode": "JIE",
  "journalLink": "https://journal.example.com"
}
```

**Response:**
```json
{
  "message": "OJS account created and article submission opened"
}
```

**Note:** Saat membuat OJS account, journalCode otomatis di-set untuk user. Jika admin sudah set journal sebelumnya, pastikan journalCode di body sama dengan yang sudah di-set.

---

## Updated Seeder

Seeder sekarang membuat:
- 3 Lookup Journals (JIE, JOEFI, JOESMENT)
- 9 Training schedules (3 untuk setiap journal):
  - **JIE:** BATCH-JIE-PAST, BATCH-JIE-TODAY, BATCH-JIE-TOMORROW
  - **JOEFI:** BATCH-JOEFI-TODAY, BATCH-JOEFI-NEXT-WEEK, BATCH-JOEFI-FULL
  - **JOESMENT:** BATCH-JOESMENT-TOMORROW, BATCH-JOESMENT-NEXT-WEEK, BATCH-JOESMENT-TWO-WEEKS

Run seeder:
```bash
npm run prisma:seed
```

---

## Testing Flow

### Scenario 1: Admin Set Journal Before OJS Account
1. User login dan complete payment
2. User start administrative stage:
   ```
   POST /api/v1/administrative/start
   ```
3. User confirm administrative:
   ```
   POST /api/v1/administrative/confirm
   Response: { "journalSelected": false, "journalCode": null }
   ```
4. **Admin set journal code:**
   ```
   POST /api/v1/admin/administrative/{userId}/set-journal
   Body: { "journalCode": "JIE" }
   ```
5. Admin create OJS account:
   ```
   POST /api/v1/admin/administrative/{userId}/ojs
   Body: { 
     "username": "user123", 
     "password": "pass123",
     "journalCode": "JIE",
     "journalLink": "https://..."
   }
   ```

### Scenario 2: Admin Set Journal via OJS Account
1. User login dan complete payment
2. User start administrative stage
3. User confirm administrative
4. **Admin create OJS account (auto set journal):**
   ```
   POST /api/v1/admin/administrative/{userId}/ojs
   Body: { 
     "username": "user123", 
     "password": "pass123",
     "journalCode": "JIE",
     "journalLink": "https://..."
   }
   ```

### Scenario 3: User View Filtered Trainings
1. After admin set journal to "JIE"
2. Admin verify article (status: ARTICLE_VERIFIED)
3. User get trainings:
   ```
   GET /api/v1/trainings
   Headers: Authorization: Bearer <token>
   Response: Only trainings with journalCode "JIE"
   ```
4. User select training:
   ```
   POST /api/v1/trainings/{trainingId}/select
   ```

### Scenario 4: User Try to Select Training Without Journal (Error)
1. User complete all steps until ARTICLE_VERIFIED
2. Admin BELUM set journal
3. User try to select training:
   ```
   POST /api/v1/trainings/{trainingId}/select
   Error: "Please select a journal group first before choosing a training schedule"
   ```

---

## Technical Implementation

### Optional Authentication
Endpoint `/api/v1/trainings` menggunakan `@OptionalAuth()` decorator yang memungkinkan:
- Request tanpa token: Berhasil, `req.user` = null
- Request dengan token valid: Berhasil, `req.user` = user data
- Request dengan token invalid: Berhasil, `req.user` = null (tidak throw error)

### Admin Authorization
Endpoint admin menggunakan:
- `@UseGuards(JwtAuthGuard, RolesGuard)`
- `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)`

Hanya admin dan super admin yang bisa set journal code untuk user.
