#!/bin/bash

# Script untuk test logging system
# Usage: ./test_logging.sh

echo "==================================="
echo "JUKI API - Test Logging System"
echo "==================================="
echo ""

# Get today's date
TODAY=$(date +%Y-%m-%d)
LOG_FILE="logs/log_${TODAY}.txt"

echo "1. Checking logs directory..."
if [ -d "logs" ]; then
    echo "✅ logs/ directory exists"
    ls -lah logs/
else
    echo "❌ logs/ directory not found"
    echo "Creating logs/ directory..."
    mkdir -p logs
    chmod 755 logs
fi

echo ""
echo "2. Checking today's log file: $LOG_FILE"
if [ -f "$LOG_FILE" ]; then
    echo "✅ Log file exists"
    echo "File size: $(du -h $LOG_FILE | cut -f1)"
    echo "Last 5 lines:"
    tail -n 5 "$LOG_FILE"
else
    echo "⚠️  Log file not found yet (will be created on first request)"
fi

echo ""
echo "3. Testing API endpoint..."
API_URL="${API_URL:-http://localhost:3001}"
echo "Hitting: $API_URL/api/v1/health"

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/api/v1/health")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API responded with 200 OK"
else
    echo "❌ API responded with code: $HTTP_CODE"
fi

echo ""
echo "4. Waiting 2 seconds for log to be written..."
sleep 2

echo ""
echo "5. Checking log file again..."
if [ -f "$LOG_FILE" ]; then
    echo "✅ Log file exists"
    echo "File size: $(du -h $LOG_FILE | cut -f1)"
    echo ""
    echo "Last 10 lines:"
    tail -n 10 "$LOG_FILE"
else
    echo "❌ Log file still not created"
    echo ""
    echo "Possible issues:"
    echo "  - Application not using Winston logger"
    echo "  - Permission issue on logs/ directory"
    echo "  - Application not running"
fi

echo ""
echo "==================================="
echo "Test completed!"
echo "==================================="
