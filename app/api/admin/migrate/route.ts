import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
};

export async function POST(request: Request) {
  try {
    // Verificar se é uma requisição admin (opcional)
    const adminKey = request.headers.get("X-Admin-Key");
    if (adminKey !== process.env.ADMIN_KEY && process.env.ADMIN_KEY) {
      return Response.json(
        { error: "Acesso negado" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Criar tabela ContactRequest
    await query(`
      CREATE TABLE IF NOT EXISTS contact_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        notes TEXT
      )
    `);

    // Criar índices
    await query(`
      CREATE INDEX IF NOT EXISTS idx_contact_requests_responded 
      ON contact_requests(responded_at)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_contact_requests_created 
      ON contact_requests(created_at DESC)
    `);

    // Adicionar coluna displayed se não existir
    await query(`
      ALTER TABLE contact_requests 
      ADD COLUMN IF NOT EXISTS displayed BOOLEAN DEFAULT FALSE
    `);

    // Criar índice para displayed
    await query(`
      CREATE INDEX IF NOT EXISTS idx_contact_requests_displayed 
      ON contact_requests(displayed)
    `);

    return Response.json(
      {
        success: true,
        message: "Migrations executadas com sucesso",
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Erro ao executar migrations:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Erro ao executar migrations",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
