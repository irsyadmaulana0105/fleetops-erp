#!/bin/sh
# Menjalankan migrasi Prisma sebelum aplikasi start.
# Container db dan app dinyalakan bersamaan oleh docker-compose, jadi database bisa saja
# belum siap menerima koneksi — migrasi dicoba ulang beberapa kali sebelum menyerah.
# Set RUN_MIGRATIONS=false untuk melewati langkah ini (mis. migrasi dijalankan terpisah).
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  attempt=1
  max_attempts=15
  until npx prisma migrate deploy; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Migrasi gagal setelah $max_attempts percobaan. Periksa DATABASE_URL dan status database." >&2
      exit 1
    fi
    echo "Migrasi belum berhasil (database belum siap?). Coba lagi dalam 4 detik ($attempt/$max_attempts)..."
    attempt=$((attempt + 1))
    sleep 4
  done
fi

exec "$@"
