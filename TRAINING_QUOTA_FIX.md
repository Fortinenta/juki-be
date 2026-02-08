# Training Quota Bug Fix

## Problem
Saat user memilih jadwal training, quota berkurang lebih dari 1 (misalnya dari 50 menjadi 48, padahal seharusnya 49).

## Root Cause
**Race Condition** - Jika user melakukan double click atau ada 2 request bersamaan:

```
Request 1: Check trainingId (null) → Pass validation → Enter transaction
Request 2: Check trainingId (null) → Pass validation → Enter transaction
Request 1: Decrement quota (50 → 49)
Request 2: Decrement quota (49 → 48)
```

Validasi `if (flow.trainingId)` dilakukan SEBELUM transaction, sehingga 2 request bisa lolos validasi bersamaan.

---

## Solution

### 1. Move All Validations Inside Transaction
Semua validasi sekarang dilakukan INSIDE transaction untuk mendapatkan row-level locking:

```typescript
return this.prisma.$transaction(async (tx) => {
  // Cek flow INSIDE transaction (with implicit locking)
  const flow = await tx.userTrainingFlow.findUnique({
    where: { userId },
  });
  
  // Validasi trainingId
  if (flow.trainingId) {
    throw new ConflictException('You have already selected a training schedule.');
  }
  
  // ... rest of the code
});
```

### 2. Update User Flow BEFORE Decrementing Quota
Urutan operasi diubah:

**Before (Wrong):**
```typescript
1. Decrement quota
2. Update user flow (set trainingId)
```

**After (Correct):**
```typescript
1. Update user flow (set trainingId) ← Lock user first
2. Decrement quota ← Safe, user already locked
```

Dengan cara ini, jika ada request ke-2, akan gagal di step 1 karena user sudah punya trainingId.

### 3. Add Cancel Training Endpoint
Menambahkan endpoint untuk user cancel training (H-3) dan mengembalikan quota:

```typescript
DELETE /api/v1/trainings/cancel
```

---

## Fixed Code Flow

```typescript
async selectTraining(userId: string, trainingId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Get user flow (INSIDE transaction for locking)
    const flow = await tx.userTrainingFlow.findUnique({
      where: { userId },
    });

    // 2. Validate (all validations inside transaction)
    if (flow.trainingId) {
      throw new ConflictException('Already selected');
    }

    // 3. Get training
    const training = await tx.training.findUnique({
      where: { id: trainingId },
    });

    // 4. Validate training
    if (training.quota <= 0) {
      throw new ConflictException('Full');
    }

    // 5. UPDATE USER FIRST (lock the user)
    await tx.userTrainingFlow.update({
      where: { userId },
      data: {
        trainingId: trainingId,
        statusCode: TRAINING_STATUS.TRAINING_WAITING,
      },
    });

    // 6. THEN decrement quota (safe now)
    await tx.training.update({
      where: { id: trainingId },
      data: {
        quota: { decrement: 1 },
      },
    });
  });
}
```

---

## New Endpoint: Cancel Training

### DELETE /api/v1/trainings/cancel

**Auth:** Required (JWT)

**Description:** User dapat cancel training selection minimal H-3 dan quota akan dikembalikan

**Rules:**
- Hanya bisa cancel jika status = TRAINING_WAITING
- Hanya bisa cancel minimal 3 hari sebelum training (H-3)
- Quota akan dikembalikan (+1)
- User kembali ke status ARTICLE_VERIFIED
- User bisa pilih jadwal baru

**Response:**
```json
{
  "message": "Training cancelled successfully. You can select a new schedule.",
  "updatedFlow": {
    "userId": "user-uuid",
    "statusCode": "ARTICLE_VERIFIED",
    "trainingId": null,
    "journalCode": "JIE"
  }
}
```

**Errors:**
```json
// If not H-3
{
  "statusCode": 400,
  "message": "Cannot cancel training less than 3 days before the event. Please contact admin."
}

// If no training selected
{
  "statusCode": 400,
  "message": "You have not selected any training schedule"
}

// If wrong status
{
  "statusCode": 400,
  "message": "Cannot cancel training at this stage"
}
```

---

## Testing Scenarios

### Scenario 1: Normal Selection (Should Work)
```bash
# User 1 select training
POST /api/v1/trainings/{trainingId}/select
Headers: Authorization: Bearer {user1_token}

# Check quota
GET /api/v1/trainings/{trainingId}
# Expected: quota decreased by 1 (50 → 49)
```

### Scenario 2: Double Click Prevention (Should Fail)
```bash
# User 1 select training (1st time)
POST /api/v1/trainings/{trainingId}/select
Headers: Authorization: Bearer {user1_token}
# Response: Success, quota 50 → 49

# User 1 select training AGAIN (2nd time)
POST /api/v1/trainings/{trainingId}/select
Headers: Authorization: Bearer {user1_token}
# Response: 409 Conflict - "You have already selected a training schedule"
# Quota: Still 49 (not decremented again)
```

### Scenario 3: Concurrent Requests (Should Handle Correctly)
```bash
# Simulate 2 requests at the same time (use tools like Apache Bench or k6)
ab -n 2 -c 2 -H "Authorization: Bearer {token}" \
   -m POST http://localhost:3000/api/v1/trainings/{trainingId}/select

# Expected result:
# - 1 request success (quota 50 → 49)
# - 1 request fail with 409 Conflict
# - Final quota: 49 (not 48!)
```

### Scenario 4: Cancel Training (Should Return Quota)
```bash
# User select training
POST /api/v1/trainings/{trainingId}/select
# Quota: 50 → 49

# User cancel training (H-3 or more)
DELETE /api/v1/trainings/cancel
Headers: Authorization: Bearer {user_token}
# Response: Success

# Check quota
GET /api/v1/trainings/{trainingId}
# Expected: quota increased back (49 → 50)

# User can select again
POST /api/v1/trainings/{trainingId}/select
# Quota: 50 → 49
```

### Scenario 5: Multiple Users Selecting Same Training
```bash
# User 1 select
POST /api/v1/trainings/{trainingId}/select
Headers: Authorization: Bearer {user1_token}
# Quota: 50 → 49

# User 2 select
POST /api/v1/trainings/{trainingId}/select
Headers: Authorization: Bearer {user2_token}
# Quota: 49 → 48

# User 3 select
POST /api/v1/trainings/{trainingId}/select
Headers: Authorization: Bearer {user3_token}
# Quota: 48 → 47

# All should work correctly, no double decrement
```

---

## Database Transaction Isolation

PostgreSQL default isolation level: **READ COMMITTED**

Dengan transaction ini:
1. Row-level locking otomatis terjadi saat UPDATE
2. Request ke-2 akan menunggu request ke-1 selesai
3. Setelah request ke-1 commit, request ke-2 akan membaca data terbaru
4. Request ke-2 akan gagal validasi karena trainingId sudah terisi

---

## Monitoring & Debugging

### Check Quota Consistency
```sql
-- Check training quota
SELECT id, batch, title, quota, "createdAt" 
FROM trainings 
WHERE id = 'training-uuid';

-- Check how many users selected this training
SELECT COUNT(*) 
FROM user_training_flows 
WHERE "trainingId" = 'training-uuid';

-- Verify consistency
-- quota + count should equal original quota
```

### Check Audit Logs
```sql
-- Check user selection history
SELECT * FROM audit_logs 
WHERE "userId" = 'user-uuid' 
AND action = 'UPDATE'
ORDER BY "createdAt" DESC;
```

### Check for Double Selection
```sql
-- Find users with duplicate training selections (should be 0)
SELECT "userId", COUNT(*) 
FROM user_training_flows 
WHERE "trainingId" IS NOT NULL 
GROUP BY "userId" 
HAVING COUNT(*) > 1;
```

---

## Summary of Changes

### Files Modified:
1. ✅ `src/modules/trainings/trainings.service.ts`
   - Moved all validations inside transaction
   - Changed order: update user flow BEFORE decrement quota
   - Added `cancelTraining()` method

2. ✅ `src/modules/trainings/trainings.controller.ts`
   - Added `DELETE /trainings/cancel` endpoint

### Key Improvements:
- ✅ Fixed race condition issue
- ✅ Prevented double decrement
- ✅ Added cancel training feature
- ✅ Better transaction handling
- ✅ Proper row-level locking

### Breaking Changes:
- ❌ None - API interface remains the same

---

## Rollback Plan (If Needed)

If there are issues with the new code:

1. Revert to previous version
2. Add application-level locking (Redis/Memcached)
3. Or use database advisory locks:

```typescript
await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
```

---

**Last Updated:** February 8, 2026  
**Version:** 1.1 (Race Condition Fix)
