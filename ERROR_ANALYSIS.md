# Analisis Error dari Log Production

## Error yang Ditemukan

### 1. ✅ PROPFIND / - 404 (FIXED)

**Error:**
```
[ERROR] ... - [PROPFIND] / - 404 - {"statusCode":404,...}
```

**Penyebab:**
- Request PROPFIND adalah WebDAV protocol
- Biasanya dari bot/scanner yang mencari WebDAV server
- Bukan error dari aplikasi kita

**Solusi:**
- ✅ Error ini sekarang **tidak di-log** untuk mengurangi noise
- Server tetap return 404 (correct behavior)

---

### 2. ✅ POST / - 404 (FIXED)

**Error:**
```
[ERROR] ... - [POST] / - 404 - {"statusCode":404,"message":"Cannot POST /"}
```

**Penyebab:**
- Request ke root path `/` tanpa prefix `/api/v1`
- Biasanya dari bot/scanner atau misconfigured client

**Solusi:**
- ✅ Error ini sekarang **tidak di-log** untuk mengurangi noise
- Semua API endpoint harus menggunakan prefix `/api/v1`

---

### 3. ✅ File Upload Error - 400 (IMPROVED)

**Error:**
```
[WARN] ... - [POST] /api/v1/payments/upload - 400 - {"message":"File is required",...}
```

**Penyebab:**
- Frontend tidak mengirim file dengan benar
- Kemungkinan:
  1. Form field name bukan "file"
  2. Content-Type bukan multipart/form-data
  3. File tidak dipilih oleh user

**Solusi:**
- ✅ Sekarang di-log sebagai **WARN** (bukan ERROR)
- ✅ Error message sangat informatif dengan:
  - Requirements (field name, allowed types, max size)
  - Example code (curl dan javascript)
  - Hint yang jelas

**Error Response Baru:**
```json
{
  "statusCode": 400,
  "message": {
    "message": "File is required",
    "hint": "Make sure to send file with key 'file' in multipart/form-data",
    "requirements": {
      "fieldName": "file",
      "contentType": "multipart/form-data",
      "allowedTypes": ["image/jpeg", "image/png", "image/jpg"],
      "allowedExtensions": [".jpg", ".jpeg", ".png"],
      "maxSize": "5MB"
    },
    "example": {
      "curl": "curl -X POST ... -F 'file=@/path/to/image.jpg'",
      "javascript": "const formData = new FormData(); formData.append('file', fileObject); ..."
    }
  }
}
```

**Frontend Fix:**
```typescript
// ✅ CORRECT
const formData = new FormData();
formData.append('file', fileObject); // key harus "file"

fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // JANGAN set Content-Type, biarkan browser set otomatis
  },
  body: formData,
});
```

**Dokumentasi Lengkap:** Lihat `PAYMENT_UPLOAD_API.md`

---

## Summary Perbaikan

### Sebelum:
```
[ERROR] PROPFIND / - 404 (noise dari bot)
[ERROR] POST / - 404 (noise dari bot)
[ERROR] File is required - 400 (validation error)
```

### Sesudah:
```
(PROPFIND dan POST / tidak di-log)
[WARN] File is required - 400 (validation error dengan hint)
```

## Log Levels Baru

| Status | Level | Keterangan |
|--------|-------|------------|
| 200-299 | INFO | Request berhasil |
| 400 | WARN | Validation error (user input salah) |
| 401 | WARN | Token expired (normal behavior) |
| 404 root | (tidak di-log) | Bot/scanner noise |
| PROPFIND | (tidak di-log) | WebDAV scanner noise |
| 500+ | ERROR | Server error (perlu segera ditangani) |

## Monitoring Commands

### Monitor Error Serius Saja
```bash
# Exclude 401, 400, dan 404
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "\[ERROR\]" | grep -v "401\|400\|404"
```

### Monitor Validation Errors (400)
```bash
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "\[WARN\].*400"
```

### Monitor File Upload Issues
```bash
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "payments/upload"
```

## Rekomendasi untuk Frontend

### 1. File Upload Fix
Pastikan frontend mengirim file dengan benar:

```typescript
// ✅ CORRECT
const formData = new FormData();
formData.append('file', selectedFile); // key: "file"

const response = await fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // JANGAN set Content-Type, biarkan browser handle
  },
  body: formData,
});

// ❌ WRONG
const response = await fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', // SALAH!
  },
  body: JSON.stringify({ file: selectedFile }), // SALAH!
});
```

### 2. Error Handling
```typescript
try {
  const response = await fetch('/api/v1/payments/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Upload failed:', error.message, error.hint);
    // Show error to user
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Testing File Upload

### Test dengan cURL:
```bash
# Test upload dengan file
curl -X POST http://localhost:3001/api/v1/payments/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"

# Expected: Success
# Actual jika error: {"message":"File is required","hint":"..."}
```

### Test dengan Postman:
1. Method: POST
2. URL: `http://localhost:3001/api/v1/payments/upload`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Body: form-data
   - Key: `file` (type: File)
   - Value: Select image file

## Next Steps

1. ✅ Backend logging sudah diperbaiki
2. ⚠️ Frontend perlu fix file upload implementation
3. 📊 Monitor log untuk memastikan tidak ada error 400 lagi setelah frontend fix
4. 🔍 Setup alerting untuk error 500+ (server error serius)
