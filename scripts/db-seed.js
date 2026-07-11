require('dotenv').config();
const { execSync } = require('child_process');

execSync(
  `psql "${process.env.DATABASE_URL}" -f db/seed.sql`,
  { stdio: 'inherit' }
);