#!/bin/sh
set -e

# Wait for the database to be ready using pg_isready
echo "Waiting for database connection at $POSTGRES_HOST:$POSTGRES_PORT..."
until pg_isready -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-juki}"; do
  echo "Waiting for database..."
  sleep 2
done
echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application with dumb-init
echo "Starting application..."
exec dumb-init "$@"