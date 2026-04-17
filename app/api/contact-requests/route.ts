import { query } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    // Buscar todas as requisições de contato que ainda não foram respondidas
    const requests = await query(
      `SELECT 
        id,
        phone,
        to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as created_at,
        responded_at
       FROM contact_requests
       WHERE responded_at IS NULL
       ORDER BY created_at DESC`
    );

    return Response.json(requests, { headers: corsHeaders });
  } catch (error) {
    console.error("Erro ao buscar requisições de contato:", error);
    return Response.json(
      { error: "Falha ao buscar requisições de contato" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return Response.json(
        { error: "Telefone é obrigatório" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar formato de telefone (básico)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
      return Response.json(
        { error: "Formato de telefone inválido" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Criar novo registro de requisição de contato
    const result = await query(
      `INSERT INTO contact_requests (phone, created_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       RETURNING id, phone, to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as created_at`,
      [phone]
    );

    return Response.json(
      {
        success: true,
        data: result[0],
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Erro ao criar requisição de contato:", error);
    return Response.json(
      { error: "Falha ao criar requisição de contato" },
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
