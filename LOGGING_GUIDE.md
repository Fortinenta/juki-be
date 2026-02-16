# Panduan Logging di JUKI API

## Sistem Logging

Project ini menggunakan **Winston** dengan **Daily Rotate File** untuk logging otomatis.

## ⚠️ Penting: Setelah Update Kode

Setelah melakukan perubahan pada logging system, Anda HARUS:

1. **Rebuild aplikasi:**
   ```bash
   npm run build
   ```

2. **Restart service:**
   ```bash
   # Jika menggunakan PM2
   pm2 restart juki-api
   
   # Jika menggunakan Docker
   docker-compose restart backend
   
   # Jika manual
   npm run start:prod
   ```

3. **Verifikasi log dibuat:**
   ```bash
   # Cek apakah file log ada
   ls -la logs/
   
   # Test dengan hit endpoint
   curl http://localhost:3001/api/v1/health
   
   # Cek log langsung
   tail -f logs/log_$(date +%Y-%m-%d).txt
   ```

## Lokasi Log Files

```
logs/
├── log_2026-02-16.txt    # Log hari ini
├── log_2026-02-15.txt    # Log kemarin
└── .d9c8512c5b4577a68afb0b6577cab35bd7eca950-audit.json  # Metadata winston
```

Log files dibuat otomatis per hari dengan format: `log_YYYY-MM-DD.txt`

## Konfigurasi Logging

- **Retention**: 14 hari (otomatis dihapus setelah 14 hari)
- **Max Size**: 20MB per file
- **Compression**: Ya (zip otomatis untuk file lama)
- **Format**: `[LEVEL] YYYY-MM-DD HH:mm:ss [Context] - Message`

## Cara Melihat Log di Server

### 1. Melihat Log Real-time (Live Tail)

```bash
# Tail log hari ini
tail -f logs/log_$(date +%Y-%m-%d).txt

# Tail dengan 100 baris terakhir
tail -n 100 -f logs/log_$(date +%Y-%m-%d).txt
```

### 2. Melihat Log Spesifik Tanggal

```bash
# Lihat log tanggal tertentu
cat logs/log_2026-02-16.txt

# Dengan pagination
less logs/log_2026-02-16.txt
```

### 3. Filter Log Berdasarkan Level

```bash
# Hanya ERROR (masalah serius)
grep "\[ERROR\]" logs/log_$(date +%Y-%m-%d).txt

# Hanya WARNING (401 unauthorized, dll)
grep "\[WARN\]" logs/log_$(date +%Y-%m-%d).txt

# ERROR dan WARN
grep -E "\[ERROR\]|\[WARN\]" logs/log_$(date +%Y-%m-%d).txt

# Hanya INFO (request berhasil)
grep "\[INFO\]" logs/log_$(date +%Y-%m-%d).txt
```

### 4. Filter Log Berdasarkan Endpoint

```bash
# Semua request ke /api/v1/auth
grep "/api/v1/auth" logs/log_$(date +%Y-%m-%d).txt

# POST request saja
grep "\[POST\]" logs/log_$(date +%Y-%m-%d).txt

# Specific endpoint dengan response time
grep "POST.*login" logs/log_$(date +%Y-%m-%d).txt
```

### 5. Cari Error Spesifik

```bash
# Cari CORS error
grep -i "cors" logs/log_$(date +%Y-%m-%d).txt

# Cari error serius (bukan 401)
grep "\[ERROR\]" logs/log_$(date +%Y-%m-%d).txt | grep -v "401"

# Cari database error
grep -i "prisma\|database" logs/log_$(date +%Y-%m-%d).txt

# Cari 500 Internal Server Error
grep "500" logs/log_$(date +%Y-%m-%d).txt
```

### 6. Statistik Request

```bash
# Hitung total request hari ini
grep -c "\[GET\]\|\[POST\]\|\[PUT\]\|\[DELETE\]\|\[PATCH\]" logs/log_$(date +%Y-%m-%d).txt

# Request per method
echo "GET: $(grep -c '\[GET\]' logs/log_$(date +%Y-%m-%d).txt)"
echo "POST: $(grep -c '\[POST\]' logs/log_$(date +%Y-%m-%d).txt)"
echo "PUT: $(grep -c '\[PUT\]' logs/log_$(date +%Y-%m-%d).txt)"
echo "DELETE: $(grep -c '\[DELETE\]' logs/log_$(date +%Y-%m-%d).txt)"
```

### 7. Monitoring Response Time

```bash
# Request dengan response time > 1000ms (slow)
grep -E "[0-9]{4,}ms" logs/log_$(date +%Y-%m-%d).txt

# Top 10 slowest requests
grep -oE "\[.*\] /api/v1/[^ ]+ - [0-9]+ms" logs/log_$(date +%Y-%m-%d).txt | sort -t'-' -k2 -nr | head -10
```

## Akses Log via HTTP

Log files juga bisa diakses via HTTP endpoint:

```bash
# Development
http://localhost:3001/log/log_2026-02-16.txt

# Production
https://juki-service.rurustudio.cloud/log/log_2026-02-16.txt
```

## Format Log

### Request Log (INFO)
```
[INFO] 2026-02-16 10:30:45 [HTTP] - [POST] /api/v1/auth/login from https://juki-hub.rurustudio.cloud - 234ms - Response: {"success":true,...}
```

### Validation Error (WARN) - User Input Error
```
[WARN] 2026-02-16 10:31:12 [ExceptionFilter] - [POST] /api/v1/payments/upload - 400 - {"message":"File is required","hint":"..."}
```
**Note:** 400 errors adalah validation error dari user input, bukan server error.

### Unauthorized Access (WARN) - Normal Behavior
```
[WARN] 2026-02-16 10:31:12 [ExceptionFilter] - [GET] /api/v1/profiles/me - 401 - Unauthorized access attempt
```
**Note:** 401 errors adalah normal ketika token expired. Frontend akan otomatis refresh token atau redirect ke login.

### Error Log (ERROR)
```
[ERROR] 2026-02-16 10:31:12 [ExceptionFilter] - [POST] /api/v1/users - 500 - {"statusCode":500,...}
Trace: Error: Database connection failed
    at PrismaClient.connect (...)
```

## Log Levels

- **INFO**: Request berhasil, operasi normal
- **WARN**: 
  - 401 Unauthorized (token expired) - normal behavior
  - 400 Bad Request (validation error) - user input error, bukan server error
- **ERROR**: Error serius (500, database error, dll) yang perlu segera ditangani

## Error yang Diabaikan (Tidak Di-log)

Untuk mengurangi noise, error berikut tidak di-log:
- **404 pada root path** (`/`) - biasanya dari bot/scanner
- **PROPFIND requests** - WebDAV requests dari bot/scanner

Ini adalah request yang tidak relevan dengan aplikasi dan hanya membuat log berantakan.

## Tips Debugging Production

### 1. Monitor Error Real-time (Exclude 401)
```bash
# Terminal 1: Monitor error serius saja (exclude 401 yang normal)
tail -f logs/log_$(date +%Y-%m-%d).txt | grep --line-buffered "\[ERROR\]" | grep -v "401"

# Terminal 2: Monitor CORS issues
tail -f logs/log_$(date +%Y-%m-%d).txt | grep --line-buffered -i "cors"

# Terminal 3: Monitor semua request dari frontend
tail -f logs/log_$(date +%Y-%m-%d).txt | grep --line-buffered "juki-hub.rurustudio.cloud"
```

### 2. Analisis Request Pattern
```bash
# Lihat 50 request terakhir
tail -n 50 logs/log_$(date +%Y-%m-%d).txt | grep -E "\[GET\]|\[POST\]|\[PUT\]|\[DELETE\]"

# Request dari IP tertentu (jika ada)
grep "192.168.1.100" logs/log_$(date +%Y-%m-%d).txt
```

### 3. Export Log untuk Analisis
```bash
# Export error hari ini
grep "\[ERROR\]" logs/log_$(date +%Y-%m-%d).txt > errors_today.txt

# Export semua request ke endpoint tertentu
grep "/api/v1/users" logs/log_*.txt > users_requests.txt
```

## Log Rotation

Winston otomatis melakukan:
- **Daily rotation**: File baru setiap hari
- **Compression**: File lama di-zip otomatis
- **Cleanup**: File > 14 hari dihapus otomatis
- **Size limit**: File > 20MB di-rotate

## Troubleshooting

### Log file kosong atau tidak ada?

**Penyebab umum:**
1. ❌ Aplikasi belum di-rebuild setelah update kode
2. ❌ Service belum direstart
3. ❌ Belum ada request yang masuk ke API
4. ❌ Permission issue pada folder logs/

**Solusi:**

1. **Rebuild dan restart:**
   ```bash
   npm run build
   pm2 restart juki-api
   ```

2. **Cek permission folder logs:**
   ```bash
   ls -la logs/
   chmod 755 logs/
   ```

3. **Test dengan hit endpoint:**
   ```bash
   # Health check
   curl http://localhost:3001/api/v1/health
   
   # Atau dari browser
   https://juki-service.rurustudio.cloud/api/v1/health
   ```

4. **Cek console output dulu:**
   ```bash
   # PM2
   pm2 logs juki-api
   
   # Docker
   docker logs juki-backend
   ```

### Log tidak muncul?
1. Cek permission folder `logs/`
   ```bash
   ls -la logs/
   chmod 755 logs/
   ```

2. Cek apakah service berjalan
   ```bash
   pm2 logs juki-api
   # atau
   docker logs juki-backend
   ```

### Log terlalu besar?
1. Kurangi retention period di `logger.service.ts`:
   ```typescript
   maxFiles: '7d'  // dari 14d ke 7d
   ```

2. Kurangi max size:
   ```typescript
   maxSize: '10m'  // dari 20m ke 10m
   ```

## Best Practices

1. **Gunakan grep dengan context** untuk melihat error lengkap:
   ```bash
   grep -A 5 -B 2 "ERROR" logs/log_$(date +%Y-%m-%d).txt
   ```

2. **Combine dengan watch** untuk monitoring:
   ```bash
   watch -n 2 'tail -20 logs/log_$(date +%Y-%m-%d).txt'
   ```

3. **Setup log aggregation** untuk production (opsional):
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Grafana Loki
   - CloudWatch Logs (AWS)
   - Datadog

## Quick Commands Cheatsheet

```bash
# Real-time monitoring
tail -f logs/log_$(date +%Y-%m-%d).txt

# Last 100 lines
tail -n 100 logs/log_$(date +%Y-%m-%d).txt

# Search errors
grep "\[ERROR\]" logs/log_$(date +%Y-%m-%d).txt

# Search by endpoint
grep "/api/v1/auth/login" logs/log_$(date +%Y-%m-%d).txt

# Count requests
grep -c "\[POST\]" logs/log_$(date +%Y-%m-%d).txt

# Slow requests (>1s)
grep -E "[0-9]{4,}ms" logs/log_$(date +%Y-%m-%d).txt
```
