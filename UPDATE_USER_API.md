# Update User API Documentation

## Endpoint
**PATCH** `/api/v1/users/:userId`

**Auth:** Required (JWT) - Admin/Super Admin only

**Description:** Update data peserta termasuk informasi pribadi, artikel, dan akun OJS

---

## Request Body (All Fields Optional)

Berdasarkan gambar "Edit Data Peserta", berikut adalah field yang bisa diupdate:

### 1. Informasi Pribadi
```json
{
  "fullName": "fort",
  "nim": "11245461",
  "email": "fort@juki.com",
  "phone": "889123456124",
  "password": "newpassword123"
}
```

**Note:** Field `password` adalah optional dan hanya bisa diupdate oleh admin untuk reset password user.

### 2. Judul Artikel
```json
{
  "articleTitle": "Judul Artikel"
}
```

### 3. Data Akun OJS (Optional)
```json
{
  "ojsUsername": "asdasdas123123",
  "ojsPassword": "password123123",
  "journalCode": "JIE",
  "ojsJournalLink": "https://chatgpt.com/c/69888c83-fa9c-8324-8907-285a8c3c8af9"
}
```

---

## Complete Request Example

Sesuai dengan form "Edit Data Peserta" di gambar:

```json
{
  "fullName": "fort",
  "nim": "11245461",
  "email": "fort@juki.com",
  "phone": "889123456124",
  "articleTitle": "Judul Artikel",
  "ojsUsername": "asdasdas123123",
  "ojsPassword": "password123123",
  "journalCode": "JIE",
  "ojsJournalLink": "https://chatgpt.com/c/69888c83-fa9c-8324-8907-285a8c3c8af9"
}
```

---

## Partial Update Examples

Anda bisa update hanya field tertentu saja:

### Update hanya nama dan NIM:
```json
{
  "fullName": "John Doe",
  "nim": "123456"
}
```

### Update hanya artikel:
```json
{
  "articleTitle": "Judul Artikel Baru"
}
```

### Update hanya akun OJS:
```json
{
  "ojsUsername": "newusername",
  "ojsPassword": "newpassword",
  "ojsJournalLink": "https://journal.example.com"
}
```

### Update hanya journal code:
```json
{
  "journalCode": "JOEFI"
}
```

---

## All Available Fields

### User Basic Info
- `email` (string, email format)
- `password` (string, minimum 6 characters) - **Admin only, for reset password**
- `role` (enum: "USER" | "ADMIN" | "SUPER_ADMIN")
- `status` (enum: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED")

### Profile Info
- `fullName` (string)
- `nim` (string)
- `phone` (string)
- `birthPlace` (string)
- `birthDate` (string, format: "YYYY-MM-DD")
- `gender` (string)

### Training Flow Info
- `articleTitle` (string)
- `journalCode` (string: "JIE" | "JOEFI" | "JOESMENT")

### OJS Account Info
- `ojsUsername` (string)
- `ojsPassword` (string)
- `ojsJournalLink` (string, URL format)

---

## Response

```json
{
  "id": "c9601948-2753-4a30-9fef-d2b4fb67a21a",
  "email": "fort@juki.com",
  "role": "USER",
  "status": "ACTIVE",
  "createdAt": "2026-02-08T10:00:00.000Z",
  "updatedAt": "2026-02-08T15:06:47.000Z",
  "profile": {
    "id": "profile-uuid",
    "userId": "c9601948-2753-4a30-9fef-d2b4fb67a21a",
    "fullName": "fort",
    "nim": "11245461",
    "phone": "889123456124",
    "birthPlace": "Jakarta",
    "birthDate": "2000-01-01T00:00:00.000Z",
    "gender": "MALE",
    "createdAt": "2026-02-08T10:00:00.000Z",
    "updatedAt": "2026-02-08T15:06:47.000Z"
  }
}
```

---

## Behavior

### 1. Update Profile
Jika field profile (fullName, nim, phone, dll) dikirim, akan update tabel `profiles`

### 2. Update Training Flow
Jika field `articleTitle` atau `journalCode` dikirim, akan update tabel `user_training_flows`

### 3. Update/Create OJS Account
Jika field OJS (ojsUsername, ojsPassword, ojsJournalLink) dikirim:
- **Jika user sudah punya OJS account:** Update existing account
- **Jika user belum punya OJS account:** Create new account dan link ke user

### 4. Journal Code Priority
Saat create/update OJS account:
1. Gunakan `journalCode` dari request body (jika ada)
2. Jika tidak ada, gunakan `journalCode` dari user training flow
3. Jika tidak ada, default ke "JIE"

---

## Error Responses

### 400 Bad Request - Invalid Field
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "ojsJournalLink must be a URL address"
  ],
  "error": "Bad Request"
}
```

### 404 Not Found - User Not Found
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### 401 Unauthorized - Not Logged In
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden - Not Admin
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Notes

1. ✅ Semua field bersifat **optional** - kirim hanya field yang ingin diupdate
2. ✅ Admin bisa update data user kapan saja
3. ✅ OJS account bisa dibuat/diupdate melalui endpoint ini
4. ✅ Journal code bisa diupdate melalui endpoint ini
5. ✅ **Admin bisa reset password user** melalui field `password`
6. ⚠️ Hati-hati saat update `journalCode` jika user sudah pilih training (harus sesuai)
7. ⚠️ Update password OJS tidak akan trigger notifikasi ke user (manual communication needed)
8. ⚠️ **Jika password diupdate, semua session user akan di-revoke** (user harus login ulang)

---

## Testing Examples

### cURL Example
```bash
curl -X PATCH http://localhost:3000/api/v1/users/c9601948-2753-4a30-9fef-d2b4fb67a21a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fullName": "fort",
    "nim": "11245461",
    "email": "fort@juki.com",
    "phone": "889123456124",
    "articleTitle": "Judul Artikel",
    "ojsUsername": "asdasdas123123",
    "ojsPassword": "password123123",
    "journalCode": "JIE",
    "ojsJournalLink": "https://chatgpt.com/c/69888c83-fa9c-8324-8907-285a8c3c8af9"
  }'
```

### Postman Example
```
Method: PATCH
URL: http://localhost:3000/api/v1/users/c9601948-2753-4a30-9fef-d2b4fb67a21a
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
Body (raw JSON):
{
  "fullName": "fort",
  "nim": "11245461",
  "email": "fort@juki.com",
  "phone": "889123456124",
  "articleTitle": "Judul Artikel",
  "ojsUsername": "asdasdas123123",
  "ojsPassword": "password123123",
  "journalCode": "JIE",
  "ojsJournalLink": "https://chatgpt.com/c/69888c83-fa9c-8324-8907-285a8c3c8af9"
}
```

---

## Comparison with Other Endpoints

| Endpoint | Purpose | Who Can Use |
|----------|---------|-------------|
| `PATCH /api/v1/users/:userId` | Update semua data user (profile, artikel, OJS) | Admin only |
| `POST /api/v1/admin/administrative/:userId/set-journal` | Set journal code saja | Admin only |
| `POST /api/v1/admin/administrative/:userId/ojs` | Create OJS account + transition status | Admin only |
| `POST /api/v1/articles/confirm-upload` | User confirm upload artikel | User only |

**Recommendation:** 
- Gunakan `PATCH /api/v1/users/:userId` untuk edit data peserta dari admin panel
- Gunakan endpoint spesifik lainnya untuk flow normal (lebih aman dan ter-audit)
