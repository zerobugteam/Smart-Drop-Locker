const { Pool } = require("pg");

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL belum diatur. Tambahkan connection string PostgreSQL (Neon/Supabase) di .env atau Environment Variables Vercel."
    );
  }

  if (!globalThis.__smartDropLockerPool) {
    const isLocal =
      process.env.DATABASE_URL.includes("localhost") ||
      process.env.DATABASE_URL.includes("127.0.0.1");

    globalThis.__smartDropLockerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }

  pool = globalThis.__smartDropLockerPool;
  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

module.exports = {
  getPool,
  query,
};

