const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Try loading .env.local or .env if present
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  try {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`📁 Encontrado ${files.length} migration(s)`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`\n⏳ Executando: ${file}`);
      try {
        await pool.query(sql);
        console.log(`✅ ${file} executada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao executar ${file}:`);
        console.error(`   ${error.message}`);
        console.error(`   Código: ${error.code}`);
      }
    }

    console.log('\n✨ Migrations concluídas!');
  } catch (error) {
    console.error('Erro ao rodar migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();
