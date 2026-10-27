import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 tidak lagi membaca .env secara otomatis dan URL datasource
// dipindahkan dari schema.prisma ke berkas konfigurasi ini.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
