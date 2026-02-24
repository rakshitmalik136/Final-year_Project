const { Pool } = require("pg");

const fallbackConnection =
  "postgres://postgres:postgres@localhost:5432/cakesnbakes";
const connectionString =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV !== "production" ? fallbackConnection : "");

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "DATABASE_URL is not set. Falling back to local postgres connection."
    );
  } else {
    console.warn("DATABASE_URL is not set. API will fail until configured.");
  }
}

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
