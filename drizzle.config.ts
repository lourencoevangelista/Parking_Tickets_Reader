import "dotenv/config"
import { defineConfig } from "drizzle-kit"

// drizzle-kit (Studio, migrate, push) needs the session pooler (port 5432); its parallel
// prepared-statement queries hang on the transaction pooler (6543) that the app uses.
const url = process.env.DATABASE_URL_SESSION
if (!url) throw new Error("DATABASE_URL_SESSION is not set. Copy .env.example to .env and fill it in.")

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  // Supabase ships its own schemas (auth, storage, ...); only manage ours.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
})
