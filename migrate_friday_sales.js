require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  CREATE TABLE IF NOT EXISTS friday_sales (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    discount INTEGER NOT NULL,
    created_at BIGINT DEFAULT 0
  )
`)
  .then(() => { console.log('✅ تم'); process.exit(0); })
  .catch(e => { console.error('❌', e.message); process.exit(1); })
