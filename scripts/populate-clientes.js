const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Função simples para carregar o .env se necessário
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  const envLocalPath = path.resolve(__dirname, '../.env.local');

  [envPath, envLocalPath].forEach((file) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // remove quotes
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  });
}

loadEnv();

console.log('🔧 Using connection string:', process.env.POSTGRES_URL || process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log("🔍 Buscando vendas existentes para extrair clientes...");

    // 1. Criar a tabela caso não exista
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public."Cliente" (
        telefone TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        documento TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Extrair todas as vendas que possuem telefone preenchido
    const { rows: vendas } = await pool.query(`
      SELECT "clienteNome", "clienteTelefone", "clienteDoc" 
      FROM public."VendaLg"
      WHERE "clienteTelefone" IS NOT NULL AND "clienteTelefone" != ''
      ORDER BY "createdAt" ASC
    `);

    console.log(`📊 Encontradas ${vendas.length} vendas com telefone para registrar.`);

    let inseridos = 0;
    let atualizados = 0;

    for (const venda of vendas) {
      const telefone = venda.clienteTelefone.trim();
      const nome = venda.clienteNome.trim();
      const doc = venda.clienteDoc ? venda.clienteDoc.trim() : null;

      if (!telefone || !nome) continue;

      // Inserir com ON CONFLICT para não duplicar, atualizando apenas nome e documento caso mudem
      const res = await pool.query(
        `INSERT INTO public."Cliente" (telefone, nome, documento, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (telefone) DO UPDATE 
         SET nome = EXCLUDED.nome, 
             documento = COALESCE(EXCLUDED.documento, public."Cliente".documento), 
             "updatedAt" = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserido`,
        [telefone, nome, doc]
      );

      if (res.rows[0].inserido) {
        inseridos++;
      } else {
        atualizados++;
      }
    }

    console.log('✅ Migração de clientes concluída com sucesso!');
    console.log(`- Clientes Novos Inseridos: ${inseridos}`);
    console.log(`- Clientes Atualizados: ${atualizados}`);

  } catch (error) {
    console.error('❌ Erro ao popular clientes:', error);
  } finally {
    await pool.end();
  }
}

run();
