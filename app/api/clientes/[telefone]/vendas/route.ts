import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ telefone: string }> }
) {
  try {
    const { telefone } = await params;
    const decodedTelefone = decodeURIComponent(telefone);

    // Fetch client to get their name for fallback matching
    const clienteRes = await query(
      `SELECT nome FROM public."Cliente" WHERE telefone = $1`,
      [decodedTelefone]
    );

    const clienteNome = (clienteRes as any[])[0]?.nome || "";

    const sales = await query(
      `SELECT 
        v.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', l.id, 
              'servicoId', l."servicoId", 
              'servicoNome', COALESCE(s.nome, 'Item'), 
              'precoOriginal', l."precoOriginal", 
              'preco', l.preco, 
              'quantidade', l.quantidade
            )
          ) FILTER (WHERE l.id IS NOT NULL), '[]'::json
        ) as linhas
       FROM "VendaLg" v
       LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
       LEFT JOIN "Service" s ON s.id = l."servicoId"
       WHERE TRIM(v."clienteTelefone") = TRIM($1)
          OR (
            (v."clienteTelefone" IS NULL OR TRIM(v."clienteTelefone") = '')
            AND $2 != '' AND LOWER(TRIM(v."clienteNome")) = LOWER(TRIM($2))
          )
       GROUP BY v.id
       ORDER BY v."dataVenda" DESC, v."createdAt" DESC`,
      [decodedTelefone, clienteNome]
    );

    return NextResponse.json(sanitizeData(sales));
  } catch (error) {
    console.error("GET /api/clientes/[telefone]/vendas error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar vendas do cliente" },
      { status: 500 }
    );
  }
}
