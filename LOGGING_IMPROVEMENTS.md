# Perbaikan Logging System - Summary

## Perubahan yang Dilakukan

### 1. ✅ Improved Error Logging Classification

**File:** `src/common/filters/all-exceptions.filter.ts`

**Perubahan:**
- 401 Unauthorized sekarang di-log sebagai **WARN** (bukan ERROR)
- Error lainnya tetap di-log sebagai **ERROR** dengan full stack trace

**Alasan:**
- 401 adalah behavior normal ketika token expired
- Frontend otomatis handle dengan refresh token atau redirect login
- Mengurangi "noise" di log sehingga error serius lebih mudah terdeteksi

**Sebelum:**
```
[ERROR] ... - 401 - {"statusCode":401,...}
Trace: UnauthorizedException: Unauthorized
    at JwtAuthGuard.handleRequest (...)
    ... (long stack trace)
```

**Sesudah:**
```
[WARN] ... - [GET] /api/v1/profiles/me - 401 - Unauthorized access attempt
```

### 2. ✅ Added Origin Tracking for CORS Debugging

**File:** `src/common/interceptors/logging.interceptor.ts`

**Perubahan:**
- Setiap request sekarang mencatat origin/referer
- Memudahkan debugging CORS issues

**Format Log Baru:**
```
[INFO] ... - [POST] /api/v1/auth/login from https://juki-hub.rurustudio.cloud - 234ms - Response: {...}
```

**Manfaat:**
- Bisa track request dari origin mana
- Mudah detect jika ada request dari origin yang tidak diizinkan
- Membantu debugging CORS configuration

### 3. ✅ Updated Documentation

**File:** `LOGGING_GUIDE.md`

**Penambahan:**
- Penjelasan log levels (INFO, WARN, ERROR)
- Command untuk filter log exclude 401
- Tips monitoring CORS issues
- Penjelasan bahwa 401 adalah normal behavior

## Cara Deploy

```bash
# 1. Rebuild aplikasi
npm run build

# 2. Restart service
pm2 restart juki-api

# 3. Monitor log (exclude 401)
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "\[ERROR\]" | grep -v "401"
```

## Contoh Log Setelah Perbaikan

### Request Berhasil (INFO)
```
[INFO] 2026-02-16 14:15:40 [HTTP] - [POST] /api/v1/auth/login from https://juki-hub.rurustudio.cloud - 269ms - Response: {"accessToken":"eyJ...","refreshToken":"eyJ..."}
```

### Token Expired (WARN) - Normal
```
[WARN] 2026-02-16 14:15:13 [ExceptionFilter] - [GET] /api/v1/profiles/me - 401 - Unauthorized access attempt
```

### Error Serius (ERROR)
```
[ERROR] 2026-02-16 14:20:15 [ExceptionFilter] - [POST] /api/v1/users - 500 - {"statusCode":500,"message":"Database connection failed"}
Trace: Error: Connection timeout
    at PrismaClient.connect (...)
```

## Monitoring Commands

### Monitor Error Serius Saja (Exclude 401)
```bash
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "\[ERROR\]" | grep -v "401"
```

### Monitor Request dari Frontend Production
```bash
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "juki-hub.rurustudio.cloud"
```

### Monitor CORS Issues
```bash
tail -f logs/log_$(date +%Y-%m-%d).txt | grep -i "cors"
```

### Count Error by Type
```bash
# Total ERROR (exclude 401)
grep "\[ERROR\]" logs/log_$(date +%Y-%m-%d).txt | grep -v "401" | wc -l

# Total WARN (mostly 401)
grep "\[WARN\]" logs/log_$(date +%Y-%m-%d).txt | wc -l

# Total successful requests
grep "\[INFO\]" logs/log_$(date +%Y-%m-%d).txt | wc -l
```

## FAQ

### Q: Kenapa banyak 401 Unauthorized di log?
**A:** Ini normal behavior. Terjadi ketika:
- User membuka aplikasi dengan token yang sudah expired
- Frontend otomatis mencoba refresh token
- Jika refresh token juga expired, user harus login ulang

Sekarang 401 di-log sebagai WARN (bukan ERROR) untuk mengurangi noise.

### Q: Bagaimana cara tahu ada error serius?
**A:** Monitor log dengan command:
```bash
tail -f logs/log_$(date +%Y-%m-%d).txt | grep "\[ERROR\]" | grep -v "401"
```

### Q: Bagaimana cara debug CORS issue?
**A:** Cek origin di log:
```bash
# Lihat request dari origin mana saja
grep "from http" logs/log_$(date +%Y-%m-%d).txt

# Cek apakah ada CORS error
grep -i "cors" logs/log_$(date +%Y-%m-%d).txt
```

### Q: Log terlalu banyak, bagaimana filter yang penting saja?
**A:** Gunakan kombinasi grep:
```bash
# Error serius + slow request (>1000ms)
tail -f logs/log_$(date +%Y-%m-%d).txt | grep -E "\[ERROR\].*[^4]01|[0-9]{4,}ms"
```

## Best Practices

1. **Jangan panik dengan 401** - ini normal, frontend akan handle
2. **Focus pada ERROR yang bukan 401** - ini yang perlu segera ditangani
3. **Monitor origin** - pastikan request hanya dari domain yang diizinkan
4. **Setup alerting** - untuk error 500 atau database issues
5. **Regular log review** - cek pattern error setiap hari

## Next Steps (Optional)

Untuk production monitoring yang lebih advanced, pertimbangkan:

1. **Log Aggregation**: ELK Stack, Grafana Loki, atau CloudWatch
2. **Alerting**: Setup alert untuk error 500 atau database down
3. **Metrics**: Track response time, error rate, dll
4. **Dashboard**: Visualisasi log dengan Grafana atau Kibana
