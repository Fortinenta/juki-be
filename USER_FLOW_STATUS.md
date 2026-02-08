# User Training Flow - Status Steps

Dokumentasi lengkap urutan status dari user mulai registrasi hingga mendapatkan LoA (Letter of Acceptance).

---

## Overview Status Steps

| Step | Status Code | Label | Actor | Description |
|------|-------------|-------|-------|-------------|
| 1 | `PAYMENT_REQUIRED` | Payment Required | System | User baru registrasi, belum bayar |
| 1 | `PAYMENT_WAITING` | Payment Waiting Verification | User | User sudah upload bukti bayar, menunggu verifikasi |
| 1 | `PAYMENT_VERIFIED` | Payment Verified | Admin | Admin sudah verifikasi pembayaran ✅ |
| 2 | `ADMINISTRATIVE_REQUIRED` | Administrative Data Required | User | User harus mengisi form administratif |
| 2 | `WAITING_ADMINISTRATIVE` | Waiting Administrative Verification | User | User sudah submit form, menunggu verifikasi admin |
| 3 | `ARTICLE_WAITING` | Article Upload Required | Admin | Admin sudah buat OJS account, user harus upload artikel |
| 3 | `ARTICLE_VERIFIED` | Article Verified | Admin | Admin sudah verifikasi artikel ✅ |
| 4 | `TRAINING_WAITING` | Waiting for Training | User | User sudah pilih jadwal, menunggu training |
| 4 | `TRAINING_VERIFIED` | Training Completed | Admin | User sudah mengikuti training ✅ |
| 4 | `TRAINING_RESCHEDULE` | Training Rescheduled | Admin | User tidak hadir, harus reschedule ⚠️ |
| 5 | `REVIEW_WAITING` | Review Required | Admin | Admin minta user revisi artikel |
| 5 | `REVIEW_VERIFIED` | Review Verified | Admin | Artikel sudah sesuai ✅ |
| 5 | `REVIEW_REVISION` | Revision Required | Admin | Artikel perlu revisi lagi ⚠️ |
| 6 | `LOA_WAITING` | Waiting for LoA | Admin | Menunggu LoA diterbitkan |
| 6 | `LOA_PUBLISHED` | LoA Published | Admin | LoA sudah diterbitkan (SELESAI) 🎉 |

**Legend:**
- ✅ = Status approved/verified
- ⚠️ = Status perlu action ulang
- 🎉 = Status final (selesai)

---

## Detailed Flow

### STEP 1: PAYMENT (Pembayaran)

#### 1.1 PAYMENT_REQUIRED
**Status Awal:** User baru registrasi

**Actor:** System (otomatis saat registrasi)

**User Action:**
- Lihat informasi pembayaran: `GET /api/v1/payments/info`
- Upload bukti pembayaran: `POST /api/v1/payments/upload`

**Next Status:** `PAYMENT_WAITING`

---

#### 1.2 PAYMENT_WAITING
**Status:** User sudah upload bukti bayar, menunggu verifikasi admin

**Actor:** User (upload bukti bayar)

**User Action:**
- Menunggu admin verifikasi
- Bisa lihat status: `GET /api/v1/flow/my-status`

**Admin Action:**
- **APPROVE:** Verifikasi pembayaran: `POST /api/v1/admin/payments/:userId/verify`
- **REJECT:** Tolak pembayaran: `POST /api/v1/admin/payments/:userId/reject`
  - Body: `{ "reason": "Bukti pembayaran tidak jelas" }`

**Next Status:** 
- ✅ `PAYMENT_VERIFIED` (jika approved)
- ❌ `PAYMENT_REQUIRED` (jika rejected - user harus upload ulang)

**Rejection Scenario:**
```
PAYMENT_WAITING → (admin reject) → PAYMENT_REQUIRED
                                         ↓
                                  (user upload ulang)
                                         ↓
                                   PAYMENT_WAITING
```

**Note:** 
- Jika ditolak, user akan menerima notifikasi dengan alasan penolakan
- User harus upload bukti pembayaran baru yang lebih jelas
- Tidak ada limit berapa kali user bisa upload ulang

---

#### 1.3 PAYMENT_VERIFIED
**Status:** Pembayaran sudah diverifikasi admin

**Actor:** Admin (verifikasi pembayaran)

**User Action:**
- Mulai tahap administratif: `POST /api/v1/administrative/start`

**Next Status:** `ADMINISTRATIVE_REQUIRED`

---

### STEP 2: ADMINISTRATIVE (Data Administratif)

#### 2.1 ADMINISTRATIVE_REQUIRED
**Status:** User harus mengisi form administratif

**Actor:** User (start administrative)

**User Action:**
- Lihat daftar journal: `GET /api/v1/administrative/journals` (untuk info saja)
- Isi form administratif (Google Form - link dari system config)
- Konfirmasi sudah isi form: `POST /api/v1/administrative/confirm`

**Next Status:** `WAITING_ADMINISTRATIVE`

**Note:** User TIDAK memilih journal sendiri. Admin yang akan set journal nanti.

---

#### 2.2 WAITING_ADMINISTRATIVE
**Status:** User sudah submit form, menunggu verifikasi admin

**Actor:** User (konfirmasi form)

**User Action:**
- Menunggu admin verifikasi data administratif

**Admin Action:**
1. **Set Journal Code untuk user:** `POST /api/v1/admin/administrative/:userId/set-journal`
   - Body: `{ "journalCode": "JIE" }` (atau JOEFI, JOESMENT)
   - **PENTING:** Admin HARUS set journal sebelum atau saat membuat OJS account

2. **APPROVE - Buat OJS Account:** `POST /api/v1/admin/administrative/:userId/ojs`
   - Body: `{ "username": "...", "password": "...", "journalCode": "JIE", "journalLink": "..." }`
   - Otomatis set journal jika belum di-set sebelumnya

3. **REJECT - Tolak Data Administratif:** `POST /api/v1/admin/administrative/:userId/reject`
   - Body: `{ "reason": "Data tidak lengkap, mohon isi ulang form" }`

**Next Status:** 
- ✅ `ARTICLE_WAITING` (jika approved & OJS account created)
- ❌ `ADMINISTRATIVE_REQUIRED` (jika rejected - user harus isi form ulang)

**Rejection Scenario:**
```
WAITING_ADMINISTRATIVE → (admin reject) → ADMINISTRATIVE_REQUIRED
                                                ↓
                                         (user isi form ulang)
                                                ↓
                                         (user confirm ulang)
                                                ↓
                                        WAITING_ADMINISTRATIVE
```

**Note:**
- Jika ditolak, user harus mengisi form administratif dari awal
- Admin bisa memberikan alasan penolakan yang spesifik
- User bisa melihat alasan penolakan di response atau notifikasi

---

### STEP 3: ARTICLE (Upload Artikel)

#### 3.1 ARTICLE_WAITING
**Status:** Admin sudah buat OJS account, user harus upload artikel

**Actor:** Admin (buat OJS account)

**User Action:**
- Lihat OJS account info: `GET /api/v1/articles/ojs-account`
- Upload artikel ke OJS (eksternal - di luar sistem)
- Konfirmasi sudah upload: `POST /api/v1/articles/confirm-upload`
  - Body: `{ "articleTitle": "Judul Artikel" }`

**Admin Action:**
- **APPROVE:** Verifikasi artikel: `POST /api/v1/admin/articles/:userId/verify`
- **REJECT:** Tolak artikel: `POST /api/v1/admin/articles/:userId/reject`
  - Body: `{ "reason": "Artikel tidak sesuai format, mohon upload ulang" }`

**Next Status:** 
- ✅ `ARTICLE_VERIFIED` (jika approved)
- ❌ `ARTICLE_WAITING` (jika rejected - user harus upload ulang)

**Rejection Scenario:**
```
ARTICLE_WAITING → (user upload) → (admin reject) → ARTICLE_WAITING
                                                          ↓
                                                   (user upload ulang)
                                                          ↓
                                                   (admin verify)
                                                          ↓
                                                   ARTICLE_VERIFIED
```

**Note:** 
- User sudah punya journalCode yang di-set oleh admin di tahap sebelumnya
- Jika ditolak, user bisa langsung upload artikel baru tanpa perlu konfirmasi ulang
- Admin bisa memberikan feedback spesifik tentang apa yang perlu diperbaiki

---

#### 3.2 ARTICLE_VERIFIED
**Status:** Admin sudah verifikasi artikel

**Actor:** Admin (verifikasi artikel)

**Admin Action:**
- Verifikasi artikel: `POST /api/v1/admin/articles/:userId/verify`

**User Action:**
- Lihat jadwal training (sudah difilter sesuai journal): `GET /api/v1/trainings`
- Pilih jadwal training: `POST /api/v1/trainings/:trainingId/select`

**Next Status:** `TRAINING_WAITING`

**Note:** 
- Jadwal training yang muncul sudah difilter sesuai journalCode user
- User hanya bisa pilih training yang sesuai dengan journalCode-nya

---

### STEP 4: TRAINING (Pelatihan)

#### 4.1 TRAINING_WAITING
**Status:** User sudah pilih jadwal, menunggu training

**Actor:** User (pilih jadwal training)

**User Action:**
- Lihat detail training saya: `GET /api/v1/trainings/my-training`
- Menunggu tanggal training
- Ikuti training sesuai jadwal
- **CANCEL (Optional):** Batal pilih training: `POST /api/v1/trainings/cancel`
  - User bisa cancel dan pilih jadwal lain jika belum H-3 training

**Admin Action (setelah training):**
- **HADIR:** Mark attendance: `POST /api/v1/admin/trainings/:userId/verify`
- **TIDAK HADIR:** Reschedule: `POST /api/v1/admin/trainings/:userId/reschedule`
  - Body: `{ "reason": "User tidak hadir tanpa keterangan" }`

**Next Status:** 
- ✅ `TRAINING_VERIFIED` (jika hadir)
- ⚠️ `TRAINING_RESCHEDULE` (jika tidak hadir)
- 🔄 `ARTICLE_VERIFIED` (jika user cancel sebelum training)

**Cancel Scenario:**
```
TRAINING_WAITING → (user cancel) → ARTICLE_VERIFIED
                                         ↓
                                  (user pilih jadwal baru)
                                         ↓
                                   TRAINING_WAITING
```

**Reschedule Scenario:**
```
TRAINING_WAITING → (training date) → (user tidak hadir) → TRAINING_RESCHEDULE
                                                                  ↓
                                                          (user pilih jadwal baru)
                                                                  ↓
                                                            TRAINING_WAITING
```

**Note:**
- User bisa cancel maksimal H-3 sebelum training
- Jika tidak hadir tanpa cancel, akan di-reschedule oleh admin
- Quota training akan dikembalikan jika user cancel

---

#### 4.2 TRAINING_VERIFIED
**Status:** User sudah mengikuti training

**Actor:** Admin (verifikasi kehadiran)

**Admin Action:**
- Admin bisa langsung approve artikel atau minta review
- Jika artikel sudah OK: `POST /api/v1/admin/review-loa/:userId/approve`
- Jika perlu review: `POST /api/v1/admin/review-loa/:userId/request-review`

**Next Status:** 
- `REVIEW_VERIFIED` (jika langsung approve)
- `REVIEW_WAITING` (jika perlu review)

---

#### 4.3 TRAINING_RESCHEDULE
**Status:** User tidak hadir, harus reschedule

**Actor:** Admin (mark tidak hadir)

**User Action:**
- Lihat alasan reschedule: `GET /api/v1/trainings/my-training`
- Pilih jadwal training baru: `POST /api/v1/trainings/:trainingId/select`

**Next Status:** `TRAINING_WAITING` (kembali menunggu training)

**Reschedule Limit:**
- User maksimal bisa reschedule **2 kali**
- Jika tidak hadir 3 kali, akun akan di-suspend atau di-reject
- Admin bisa memberikan warning kepada user

**Scenario:**
```
TRAINING_RESCHEDULE (1st) → (pilih jadwal baru) → TRAINING_WAITING → (tidak hadir lagi)
                                                                            ↓
                                                                  TRAINING_RESCHEDULE (2nd)
                                                                            ↓
                                                                  (pilih jadwal baru)
                                                                            ↓
                                                                     TRAINING_WAITING
                                                                            ↓
                                                                  (tidak hadir lagi)
                                                                            ↓
                                                                    ⚠️ ACCOUNT SUSPENDED
```

**Note:**
- Setiap reschedule akan dicatat di audit log
- Admin bisa melihat history kehadiran user
- User yang sering tidak hadir bisa di-blacklist

---

### STEP 5: REVIEW (Review Artikel)

#### 5.1 REVIEW_WAITING
**Status:** Admin minta user revisi artikel

**Actor:** Admin (request review)

**User Action:**
- Lihat feedback admin: `GET /api/v1/articles/review-feedback`
- Revisi artikel di OJS (eksternal)
- Konfirmasi sudah revisi: `POST /api/v1/articles/confirm-revision`
  - Body: `{ "revisionNotes": "Sudah diperbaiki sesuai feedback" }`

**Admin Action:**
- **APPROVE:** Verifikasi revisi: `POST /api/v1/admin/review-loa/:userId/verify-review`
- **REJECT:** Minta revisi lagi: `POST /api/v1/admin/review-loa/:userId/request-revision`
  - Body: `{ "feedback": "Masih ada yang perlu diperbaiki di bagian metodologi" }`

**Next Status:** 
- ✅ `REVIEW_VERIFIED` (jika revisi OK)
- ⚠️ `REVIEW_REVISION` (jika perlu revisi lagi)

**Review Cycle:**
```
REVIEW_WAITING → (user revisi) → (admin verify) → REVIEW_VERIFIED
       ↑                                  ↓
       |                          (admin request revision)
       |                                  ↓
       ←←←←←←←←←←←←←←←←←←←←←←←←← REVIEW_REVISION
```

**Note:**
- Tidak ada limit berapa kali user bisa revisi
- Admin harus memberikan feedback yang jelas setiap kali minta revisi
- User bisa berkomunikasi dengan admin via feedback system

---

#### 5.2 REVIEW_VERIFIED
**Status:** Artikel sudah sesuai, siap terbit

**Actor:** Admin (verifikasi review)

**Admin Action:**
- Publish LoA: `POST /api/v1/admin/review-loa/:userId/publish-loa`

**Next Status:** `LOA_WAITING`

---

#### 5.3 REVIEW_REVISION
**Status:** Artikel perlu revisi lagi

**Actor:** Admin (request revision)

**User Action:**
- Lihat feedback terbaru: `GET /api/v1/articles/review-feedback`
- Revisi artikel lagi di OJS
- Konfirmasi sudah revisi: `POST /api/v1/articles/confirm-revision`

**Next Status:** `REVIEW_WAITING` (kembali ke review)

**Multiple Revision Scenario:**
```
REVIEW_REVISION → (user revisi) → REVIEW_WAITING → (admin check)
       ↑                                                  ↓
       |                                          (masih perlu revisi)
       |                                                  ↓
       ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←← REVIEW_REVISION
                                                          ↓
                                                   (user revisi lagi)
                                                          ↓
                                                    REVIEW_WAITING
                                                          ↓
                                                    (admin approve)
                                                          ↓
                                                    REVIEW_VERIFIED
```

**Note:**
- Setiap revisi akan dicatat dengan timestamp
- Admin bisa melihat history revisi
- User bisa melihat semua feedback yang pernah diberikan

---

### STEP 6: LOA (Letter of Acceptance)

#### 6.1 LOA_WAITING
**Status:** Menunggu LoA diterbitkan

**Actor:** Admin (publish LoA)

**User Action:**
- Menunggu admin upload LoA

**Admin Action:**
- Upload LoA: `POST /api/v1/admin/review-loa/:userId/upload-loa`
  - Upload file LoA

**Next Status:** `LOA_PUBLISHED`

---

#### 6.2 LOA_PUBLISHED
**Status:** LoA sudah diterbitkan (SELESAI)

**Actor:** Admin (upload LoA)

**User Action:**
- Download LoA: `GET /api/v1/attachments/:attachmentId/download`
- Lihat LoA saya: `GET /api/v1/attachments/my-loa`

**Next Status:** SELESAI (tidak ada status berikutnya)

---

## Flow Diagram (Complete with Rejections)

```
START (User Register)
  ↓
PAYMENT_REQUIRED → (user upload) → PAYMENT_WAITING → (admin verify) → PAYMENT_VERIFIED
       ↑                                  ↓
       |                          (admin reject)
       ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  ↓
ADMINISTRATIVE_REQUIRED → (user confirm) → WAITING_ADMINISTRATIVE → (admin create OJS) → ARTICLE_WAITING
       ↑                                              ↓
       |                                      (admin reject)
       ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  ↓
ARTICLE_WAITING → (user upload) → (admin verify) → ARTICLE_VERIFIED
       ↑                                  ↓
       |                          (admin reject)
       ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  ↓
ARTICLE_VERIFIED → (user select training) → TRAINING_WAITING → (training date) → TRAINING_VERIFIED
       ↑                                            ↓                                      ↓
       |                                    (user cancel H-3)                     (admin approve)
       ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←                                      ↓
                                                    ↓                              REVIEW_VERIFIED
                                            (user no-show)                                ↓
                                                    ↓                           (admin publish)
                                          TRAINING_RESCHEDULE                             ↓
                                                    ↓                              LOA_WAITING
                                          (select new training)                           ↓
                                                    ↓                           (admin upload)
                                            TRAINING_WAITING                               ↓
                                                                                   LOA_PUBLISHED
                                                                                           ↓
                                                                                          END

REVIEW CYCLE (if needed):
TRAINING_VERIFIED → (admin request review) → REVIEW_WAITING → (user revisi) → (admin verify) → REVIEW_VERIFIED
                                                    ↑                                  ↓
                                                    |                          (admin request revision)
                                                    |                                  ↓
                                                    ←←←←←←←←←←←←←←←←←←←←←←← REVIEW_REVISION
```

**Legend:**
- → : Normal flow (forward)
- ← : Rejection/Cancel flow (backward)
- ↓ : Continue to next step

---

## Important Notes

### Journal Selection
- ❌ User TIDAK bisa memilih journal sendiri
- ✅ Admin yang set journal code untuk user
- ✅ Admin bisa set journal saat tahap WAITING_ADMINISTRATIVE
- ✅ Admin bisa set journal saat membuat OJS account
- ❌ Admin tidak bisa ganti journal setelah user pilih training

### Training Selection
- ✅ User hanya bisa pilih training setelah ARTICLE_VERIFIED
- ✅ Training yang muncul sudah difilter sesuai journalCode user
- ✅ User hanya bisa pilih training yang sesuai dengan journalCode-nya
- ❌ User tidak bisa pilih training jika admin belum set journal

### Status Transition Rules
- Status hanya bisa maju ke depan (tidak bisa mundur kecuali reschedule)
- Setiap transisi status dicatat di audit log
- User tidak bisa skip step (harus urut)
- Admin bisa force transition jika diperlukan

---

---

## Edge Cases & Special Scenarios

### 1. Payment Rejection Loop
**Scenario:** User terus upload bukti bayar yang tidak valid

**Flow:**
```
PAYMENT_REQUIRED → PAYMENT_WAITING → (rejected) → PAYMENT_REQUIRED
                                                          ↓
                                                   (upload ulang)
                                                          ↓
                                                   PAYMENT_WAITING
                                                          ↓
                                                   (rejected lagi)
                                                          ↓
                                                   PAYMENT_REQUIRED
```

**Solution:**
- Admin bisa memberikan instruksi yang jelas di reason rejection
- Setelah 3x rejection, admin bisa contact user langsung
- System bisa auto-flag user yang sering di-reject

---

### 2. Administrative Data Rejection
**Scenario:** User mengisi form administratif dengan data yang tidak lengkap

**Flow:**
```
ADMINISTRATIVE_REQUIRED → WAITING_ADMINISTRATIVE → (rejected) → ADMINISTRATIVE_REQUIRED
                                                                        ↓
                                                                 (isi form ulang)
                                                                        ↓
                                                                WAITING_ADMINISTRATIVE
```

**Solution:**
- Admin memberikan feedback spesifik tentang data yang kurang
- User bisa melihat data yang sudah diisi sebelumnya
- System bisa highlight field yang perlu diperbaiki

---

### 3. Article Rejection
**Scenario:** Artikel tidak sesuai format atau guideline

**Flow:**
```
ARTICLE_WAITING → (user upload) → (admin reject) → ARTICLE_WAITING
                                                          ↓
                                                   (user upload ulang)
                                                          ↓
                                                   (admin verify)
                                                          ↓
                                                   ARTICLE_VERIFIED
```

**Solution:**
- Admin memberikan checklist apa yang perlu diperbaiki
- User bisa download template artikel
- System bisa auto-check format dasar (file type, size, dll)

---

### 4. Training No-Show (Tidak Hadir)
**Scenario:** User tidak hadir training tanpa pemberitahuan

**Flow:**
```
TRAINING_WAITING → (training date) → (no show) → TRAINING_RESCHEDULE
                                                          ↓
                                                   (pilih jadwal baru)
                                                          ↓
                                                   TRAINING_WAITING
                                                          ↓
                                                   (no show lagi)
                                                          ↓
                                                   TRAINING_RESCHEDULE (2nd)
                                                          ↓
                                                   (pilih jadwal baru)
                                                          ↓
                                                   TRAINING_WAITING
                                                          ↓
                                                   (no show lagi - 3rd time)
                                                          ↓
                                                   ⚠️ ACCOUNT SUSPENDED
```

**Solution:**
- User bisa cancel training maksimal H-3
- System kirim reminder H-1 dan H-0
- Setelah 3x no-show, akun di-suspend
- User harus contact admin untuk reactivate

---

### 5. Multiple Review Revisions
**Scenario:** Artikel perlu banyak revisi

**Flow:**
```
REVIEW_WAITING → REVIEW_REVISION → REVIEW_WAITING → REVIEW_REVISION
       ↑                                                      ↓
       |                                               (revisi ke-N)
       |                                                      ↓
       ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←← REVIEW_WAITING
                                                              ↓
                                                       (finally approved)
                                                              ↓
                                                        REVIEW_VERIFIED
```

**Solution:**
- Tidak ada limit revisi (quality over speed)
- Admin bisa schedule meeting dengan user untuk diskusi
- System track berapa kali revisi untuk improvement

---

### 6. User Cancel Training
**Scenario:** User ingin ganti jadwal training sebelum H-3

**Flow:**
```
TRAINING_WAITING → (user cancel H-3 or more) → ARTICLE_VERIFIED
                                                       ↓
                                                (pilih jadwal baru)
                                                       ↓
                                                 TRAINING_WAITING
```

**Rules:**
- Cancel hanya bisa dilakukan minimal H-3
- Quota training dikembalikan
- User bisa langsung pilih jadwal baru
- Jika cancel kurang dari H-3, tidak bisa cancel (harus contact admin)

---

### 7. Admin Force Transition
**Scenario:** Admin perlu force move user ke status tertentu

**Use Cases:**
- User stuck di status tertentu karena bug
- User perlu di-skip ke status tertentu karena alasan khusus
- Emergency situation

**Admin Action:**
```
POST /api/v1/admin/flow/:userId/force-transition
Body: {
  "targetStatus": "ARTICLE_VERIFIED",
  "reason": "User sudah upload artikel via email",
  "skipValidation": true
}
```

**Note:**
- Hanya Super Admin yang bisa force transition
- Semua force transition dicatat di audit log
- Harus ada reason yang jelas

---

### 8. Account Suspension
**Scenario:** User melanggar aturan atau tidak kooperatif

**Triggers:**
- 3x no-show training tanpa alasan
- Upload konten yang tidak pantas
- Melanggar code of conduct

**Admin Action:**
```
POST /api/v1/admin/users/:userId/suspend
Body: {
  "reason": "3x tidak hadir training tanpa pemberitahuan",
  "duration": "30 days" // atau "permanent"
}
```

**Effect:**
- User tidak bisa login
- Semua progress di-freeze
- User bisa appeal ke admin

**Reactivation:**
```
POST /api/v1/admin/users/:userId/reactivate
Body: {
  "reason": "User sudah memberikan penjelasan yang valid"
}
```

---

### 9. Journal Code Change Request
**Scenario:** User ingin ganti kelompok jurnal setelah di-set admin

**Flow:**
```
User Request → Admin Review → Admin Decision
                                    ↓
                            (Approve or Reject)
```

**Rules:**
- User TIDAK bisa ganti sendiri
- User bisa request ke admin via feedback/support
- Admin bisa approve jika user belum pilih training
- Admin TIDAK bisa approve jika user sudah pilih training

**Admin Action (if approved):**
```
POST /api/v1/admin/administrative/:userId/set-journal
Body: { "journalCode": "JOEFI" }
```

---

### 10. Duplicate Training Selection
**Scenario:** User coba pilih training 2x (race condition)

**Prevention:**
- Database constraint: unique userId di training selection
- API validation: cek apakah user sudah punya trainingId
- Transaction lock saat update

**Error Response:**
```json
{
  "statusCode": 409,
  "message": "You have already selected a training schedule",
  "error": "Conflict"
}
```

---

## Status Transition Rules & Validations

### Cannot Go Backward (Except Rejection)
```
❌ PAYMENT_VERIFIED → PAYMENT_WAITING (tidak bisa mundur)
✅ PAYMENT_WAITING → PAYMENT_REQUIRED (bisa mundur jika rejected)
```

### Must Follow Sequence
```
❌ PAYMENT_REQUIRED → ARTICLE_WAITING (skip step - tidak boleh)
✅ PAYMENT_REQUIRED → PAYMENT_WAITING → PAYMENT_VERIFIED → ... (harus urut)
```

### Special Transitions
```
✅ TRAINING_WAITING → ARTICLE_VERIFIED (jika user cancel)
✅ TRAINING_WAITING → TRAINING_RESCHEDULE (jika no-show)
✅ TRAINING_RESCHEDULE → TRAINING_WAITING (pilih jadwal baru)
✅ REVIEW_REVISION → REVIEW_WAITING (submit revisi)
```

---

## Quick Reference: User Actions by Status

| Status | User Can Do | Can Be Rejected? |
|--------|-------------|------------------|
| PAYMENT_REQUIRED | Upload bukti bayar | - |
| PAYMENT_WAITING | Menunggu (no action) | ✅ Yes → back to PAYMENT_REQUIRED |
| PAYMENT_VERIFIED | Start administrative | - |
| ADMINISTRATIVE_REQUIRED | Isi form & confirm | - |
| WAITING_ADMINISTRATIVE | Menunggu (no action) | ✅ Yes → back to ADMINISTRATIVE_REQUIRED |
| ARTICLE_WAITING | Upload artikel & confirm | ✅ Yes → stay in ARTICLE_WAITING |
| ARTICLE_VERIFIED | Pilih jadwal training | - |
| TRAINING_WAITING | Menunggu training date, bisa cancel H-3 | - |
| TRAINING_VERIFIED | Menunggu (no action) | - |
| TRAINING_RESCHEDULE | Pilih jadwal baru | ⚠️ Max 2x reschedule |
| REVIEW_WAITING | Revisi artikel | - |
| REVIEW_VERIFIED | Menunggu (no action) | - |
| REVIEW_REVISION | Revisi artikel lagi | ⚠️ Unlimited revisions |
| LOA_WAITING | Menunggu (no action) | - |
| LOA_PUBLISHED | Download LoA | - |

---

## Quick Reference: Admin Actions by Status

| Status | Admin Can Do | Can Reject? |
|--------|-------------|-------------|
| PAYMENT_WAITING | Verify/Reject payment | ✅ Yes |
| WAITING_ADMINISTRATIVE | Set journal & create OJS / Reject | ✅ Yes |
| ARTICLE_WAITING | Verify/Reject article | ✅ Yes |
| TRAINING_WAITING | Mark attendance after training | - |
| TRAINING_VERIFIED | Approve or request review | - |
| REVIEW_WAITING | Verify review or request revision | ⚠️ Request revision |
| REVIEW_VERIFIED | Publish LoA | - |
| LOA_WAITING | Upload LoA file | - |

**Admin Special Actions:**
- Force transition (Super Admin only)
- Suspend/Reactivate account
- Change journal code (before training selection)
- Manual override for edge cases

---

## Summary: Rejection & Edge Cases

### ✅ Can Be Rejected (User Must Retry)
1. **PAYMENT_WAITING** → Rejected → PAYMENT_REQUIRED (upload bukti bayar ulang)
2. **WAITING_ADMINISTRATIVE** → Rejected → ADMINISTRATIVE_REQUIRED (isi form ulang)
3. **ARTICLE_WAITING** → Rejected → ARTICLE_WAITING (upload artikel ulang)

### ⚠️ Special Cases (Not Rejection, But Need Action)
4. **TRAINING_WAITING** → No Show → TRAINING_RESCHEDULE (pilih jadwal baru, max 2x)
5. **REVIEW_WAITING** → Need Revision → REVIEW_REVISION (revisi artikel, unlimited)

### 🔄 User Can Cancel
6. **TRAINING_WAITING** → User Cancel (H-3) → ARTICLE_VERIFIED (pilih jadwal baru)

### 🚫 Account Suspension Triggers
- 3x no-show training tanpa alasan
- Upload konten tidak pantas
- Melanggar code of conduct

### 📊 Tracking & Audit
- Semua rejection dicatat dengan reason
- Semua transition dicatat di audit log
- Admin bisa lihat history lengkap user
- User bisa lihat feedback dari admin

---

## Best Practices

### For Users:
1. ✅ Upload bukti pembayaran yang jelas
2. ✅ Isi form administratif dengan lengkap
3. ✅ Upload artikel sesuai format dan guideline
4. ✅ Hadir training sesuai jadwal (atau cancel H-3)
5. ✅ Revisi artikel sesuai feedback admin
6. ✅ Komunikasi dengan admin jika ada kendala

### For Admins:
1. ✅ Berikan reason yang jelas saat reject
2. ✅ Set journal code sebelum create OJS account
3. ✅ Verifikasi data dengan teliti
4. ✅ Berikan feedback konstruktif untuk revisi
5. ✅ Track user yang sering di-reject atau no-show
6. ✅ Gunakan force transition hanya untuk emergency

---

**Last Updated:** February 8, 2026  
**Version:** 2.0 (Complete with Rejections & Edge Cases)
