import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (e.g. prisma migrate deploy) requires DIRECT_URL for direct database access,
// bypassing Neon's connection pooler which disallows advisory locks.
// Falls back to DATABASE_URL in development/test environments where pooling is not used.
const migrationUrl =
  process.env["DIRECT_URL"] ||
  (process.env.NODE_ENV === "production" ? undefined : process.env["DATABASE_URL"]);

if (!migrationUrl) {
  throw new Error(
    "Missing required database connection URL for Prisma CLI. DIRECT_URL must be defined in production."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
