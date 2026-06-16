import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, // allow up to 20 connections in pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // fail fast after 5 seconds
});

export const testDbConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully");
  } finally {
    client.release();
  }
};