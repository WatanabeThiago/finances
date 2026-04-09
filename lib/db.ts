import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

export async function initializeDatabase() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS public."Partner" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nome TEXT NOT NULL,
        telefone TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public."Produto" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nome TEXT NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public."Service" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "fotoDataUrl" TEXT,
        nome TEXT NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        "valorNoturno" DECIMAL(10, 2) NOT NULL,
        "gastosEstimados" DECIMAL(10, 2) NOT NULL,
        observacoes TEXT DEFAULT '',
        automotivo BOOLEAN DEFAULT false,
        residencial BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Join tables for relationships
    await sql`
      CREATE TABLE IF NOT EXISTS public."_PartnerToService" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL,
        PRIMARY KEY ("A", "B"),
        FOREIGN KEY ("A") REFERENCES public."Partner"(id) ON DELETE CASCADE,
        FOREIGN KEY ("B") REFERENCES public."Service"(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public."_ProdutoToService" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL,
        PRIMARY KEY ("A", "B"),
        FOREIGN KEY ("A") REFERENCES public."Produto"(id) ON DELETE CASCADE,
        FOREIGN KEY ("B") REFERENCES public."Service"(id) ON DELETE CASCADE
      );
    `;

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

export { sql };
