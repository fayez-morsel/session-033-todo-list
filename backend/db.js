import "./env.js";
import pg from "pg";

const { Pool } = pg;

function buildPoolConfig() {
  const config = {
    connectionString: process.env.DATABASE_URL,
  };

  const needsSsl =
    process.env.PGSSL_DISABLE !== "true" &&
    (/\bsslmode=(require|verify-full|verify-ca)/i.test(
      process.env.DATABASE_URL || ""
    ) ||
      (process.env.DATABASE_URL || "").includes("supabase.co") ||
      process.env.FORCE_PG_SSL === "true");

  if (needsSsl) {
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  return config;
}

export const pool = new Pool(buildPoolConfig());

//Helper: run query with params
export async function q(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
