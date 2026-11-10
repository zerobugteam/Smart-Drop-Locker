const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
dotenv.config();
const app = require("./src/app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Smart Drop Locker berjalan di http://localhost:${PORT}`);
});

