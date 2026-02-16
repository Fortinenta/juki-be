# Payment Upload API Documentation

## Endpoint

```
POST /api/v1/payments/upload
```

## Authentication

Required: Bearer Token (JWT)

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Requirements

- **Field Name**: `file`
- **Content-Type**: `multipart/form-data`
- **Allowed Types**: `image/jpeg`, `image/png`, `image/jpg`
- **Allowed Extensions**: `.jpg`, `.jpeg`, `.png`
- **Max Size**: 5MB

## Success Response (200)

```json
{
  "id": "uuid",
  "userId": "uuid",
  "filePath": "uploads/payments/uuid-filename.jpg",
  "status": "PAYMENT_WAITING",
  "createdAt": "2026-02-16T07:30:00.000Z"
}
```

## Error Responses

### 1. File Not Provided (400)

**Cause:** Request tidak mengirim file atau field name salah

**Response:**
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
      "javascript": "formData.append('file', fileObject);"
    }
  }
}
```

### 2. Invalid File Type (400)

**Cause:** File bukan image atau format tidak didukung

**Response:**
```json
{
  "statusCode": 400,
  "message": {
    "message": "Only image files (jpg, jpeg, png) are allowed",
    "received": {
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "extension": ".pdf"
    },
    "allowed": {
      "mimetypes": ["image/jpeg", "image/png", "image/jpg"],
      "extensions": [".jpg", ".jpeg", ".png"]
    }
  }
}
```

### 3. File Too Large (400)

**Cause:** File size melebihi 5MB

**Response:**
```json
{
  "statusCode": 400,
  "message": "File too large. Maximum size is 5MB"
}
```

### 4. Unauthorized (401)

**Cause:** Token tidak valid atau expired

**Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 5. Wrong Flow Status (403)

**Cause:** User tidak dalam status PAYMENT_REQUIRED atau PAYMENT_WAITING

**Response:**
```json
{
  "statusCode": 403,
  "message": "Access denied. Required status: PAYMENT_REQUIRED or PAYMENT_WAITING"
}
```

## Examples

### cURL

```bash
curl -X POST http://localhost:3001/api/v1/payments/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/payment-proof.jpg"
```

### JavaScript (Fetch API)

```javascript
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    // DO NOT set Content-Type, browser will set it automatically with boundary
  },
  body: formData,
});

if (!response.ok) {
  const error = await response.json();
  console.error('Upload failed:', error.message);
  
  // Show requirements to user
  if (error.message.requirements) {
    console.log('Requirements:', error.message.requirements);
  }
  
  // Show example
  if (error.message.example) {
    console.log('Example:', error.message.example.javascript);
  }
} else {
  const result = await response.json();
  console.log('Upload success:', result);
}
```

### JavaScript (Axios)

```javascript
const formData = new FormData();
formData.append('file', fileObject);

try {
  const response = await axios.post('/api/v1/payments/upload', formData, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      // Axios will automatically set Content-Type: multipart/form-data
    },
  });
  
  console.log('Upload success:', response.data);
} catch (error) {
  if (error.response) {
    console.error('Upload failed:', error.response.data.message);
    
    // Show requirements
    if (error.response.data.message.requirements) {
      console.log('Requirements:', error.response.data.message.requirements);
    }
  }
}
```

### React Example

```typescript
import { useState } from 'react';

function PaymentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError({ message: 'Please select a file' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/payments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message);
        return;
      }

      const result = await response.json();
      console.log('Upload success:', result);
      // Handle success (e.g., show success message, redirect)
    } catch (err) {
      setError({ message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".jpg,.jpeg,.png" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload Payment Proof'}
      </button>

      {error && (
        <div style={{ color: 'red' }}>
          <p>{error.message}</p>
          {error.requirements && (
            <div>
              <p>Requirements:</p>
              <ul>
                <li>Field name: {error.requirements.fieldName}</li>
                <li>Max size: {error.requirements.maxSize}</li>
                <li>Allowed types: {error.requirements.allowedExtensions.join(', ')}</li>
              </ul>
            </div>
          )}
          {error.example && (
            <details>
              <summary>Show example code</summary>
              <pre>{error.example.javascript}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
```

## Common Mistakes

### ❌ Wrong: Setting Content-Type manually

```javascript
// DON'T DO THIS
fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', // WRONG!
  },
  body: JSON.stringify({ file: fileObject }), // WRONG!
});
```

### ❌ Wrong: Wrong field name

```javascript
// DON'T DO THIS
formData.append('image', file); // WRONG! Should be 'file'
formData.append('payment', file); // WRONG! Should be 'file'
```

### ❌ Wrong: Sending file as base64 string

```javascript
// DON'T DO THIS
fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    file: base64String, // WRONG!
  }),
});
```

### ✅ Correct: Using FormData

```javascript
// DO THIS
const formData = new FormData();
formData.append('file', fileObject); // Correct field name

fetch('/api/v1/payments/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // Don't set Content-Type, let browser handle it
  },
  body: formData,
});
```

## Testing

### Test with valid image

```bash
# Create a test image
convert -size 100x100 xc:white test.jpg

# Upload
curl -X POST http://localhost:3001/api/v1/payments/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg"
```

### Test with invalid file type

```bash
# Try to upload PDF (should fail)
curl -X POST http://localhost:3001/api/v1/payments/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"

# Expected: 400 with detailed error about allowed types
```

### Test without file

```bash
# Try to upload without file (should fail)
curl -X POST http://localhost:3001/api/v1/payments/upload \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 400 with requirements and examples
```

## Troubleshooting

### Error: "File is required"

**Possible causes:**
1. Field name bukan "file"
2. Request tidak menggunakan multipart/form-data
3. File tidak dipilih oleh user

**Solution:** Check error response, akan ada `requirements` dan `example` yang menjelaskan cara yang benar.

### Error: "Only image files are allowed"

**Possible causes:**
1. File bukan image (PDF, DOC, dll)
2. Extension tidak sesuai dengan mimetype

**Solution:** Check error response, akan ada `received` dan `allowed` yang menjelaskan file apa yang diterima dan apa yang diizinkan.

### Error: "File too large"

**Solution:** Compress image atau resize sebelum upload. Max size: 5MB.
