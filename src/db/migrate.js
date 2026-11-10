const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { getSslOption } = require("./index");

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Jalankan schema.sql menggunakan koneksi direct (DATABASE_URL_UNPOOLED)
 * sesuai praktik terbaik migrasi skema Neon.
 */
async function runMigration() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_UNPOOLED atau DATABASE_URL belum diatur di .env / .env.local."
    );
  }

  const schemaPath = path.join(__dirname, "..", "..", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = new Client({
    connectionString,
    ssl: getSslOption(connectionString),
  });

  await client.connect();
  try {
    await client.query(sql);
    const tablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tables = tablesRes.rows.map((r) => r.table_name);
    console.log("Migrasi schema.sql selesai. Tabel aktif:", tables.join(", "));
  } finally {
    await client.end();
  }
}

runMigration().catch((err) => {
  console.error("Migrasi gagal:", err.message);
  process.exit(1);
});

