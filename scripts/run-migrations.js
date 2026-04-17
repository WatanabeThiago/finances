const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
