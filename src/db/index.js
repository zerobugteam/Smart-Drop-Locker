const { Pool } = require("pg");

let pool;

function getSslOption(connectionString) {
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");
  return isLocal ? false : { rejectUnauthorized: false };
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL belum diatur. Tambahkan connection string PostgreSQL (Neon/Supabase) di .env atau Environment Variables Vercel."
    );
  }

  if (!globalThis.__smartDropLockerPool) {
    globalThis.__smartDropLockerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: getSslOption(process.env.DATABASE_URL),
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
  getSslOption,
  query,
};

