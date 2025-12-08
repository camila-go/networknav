import type { Config } from "drizzle-kit";

// Drizzle configuration for database migrations
// Note: DATABASE_URL must be set in environment variables
const config: Config = {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};

export default config;
