import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(
      `SELECT v.*, 
              COALESCE(json_agg(json_build_object('id', l.id, 'servicoId', l."servicoId", 'precoOriginal', l."precoOriginal", 'preco', l.preco, 'quantidade', l.quantidade)) FILTER (WHERE l.id IS NOT NULL), '[]'::json) as linhas
       FROM "VendaLg" v
       LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
       GROUP BY v.id
       ORDER BY v."createdAt" DESC`
    );
    return NextResponse.json(sanitizeData(result));
  } catch (error) {
    console.error("GET /api/vendas-lg error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar vendas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clienteNome,
      clienteTelefone,
      clienteDoc,
      vehiclePlate,
      endereco,
      latitude,
      longitude,
      prestadorId,
      comissao,
      comissaoPaga,
      formaPagamento,
      clientePagou,
      dataVenda,
      linhas,
    } = body;

    if (!clienteNome) {
      return NextResponse.json(
        { error: "Nome do cliente é obrigatório" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    
    // Insert main venda record
    await query(
      `INSERT INTO "VendaLg" (id, "clienteNome", "clienteTelefone", "clienteDoc", "vehiclePlate", endereco, latitude, longitude, "prestadorId", comissao, "comissaoPaga", "formaPagamento", "clientePagou", "dataVenda", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        id,
        clienteNome,
        clienteTelefone || null,
        clienteDoc || null,
        typeof vehiclePlate === "string" ? vehiclePlate.trim().toUpperCase() || null : null,
        endereco || null,
        latitude || null,
        longitude || null,
        prestadorId || null,
        comissao || null,
        comissaoPaga || false,
        typeof formaPagamento === "string" ? formaPagamento.trim() || null : null,
        clientePagou === true,
        dataVenda || new Date().toISOString(),
      ]
    );

    // Auto-create or update client
    if (clienteTelefone && clienteNome) {
      await query(
        `INSERT INTO public."Cliente" (telefone, nome, documento, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (telefone) DO UPDATE 
         SET nome = EXCLUDED.nome, 
             documento = COALESCE(EXCLUDED.documento, public."Cliente".documento), 
             "updatedAt" = CURRENT_TIMESTAMP`,
        [clienteTelefone, clienteNome, clienteDoc || null]
      );
    }

    // Insert linhas
    if (Array.isArray(linhas) && linhas.length > 0) {
      for (const linha of linhas) {
        await query(
          `INSERT INTO "VendaLgLine" (id, "vendaLgId", "servicoId", "precoOriginal", preco, quantidade)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            linha.id || crypto.randomUUID(),
            id,
            linha.servicoId,
            linha.precoOriginal,
            linha.preco,
            linha.quantidade,
          ]
        );

        // Auto-link partner (prestadorId) to service (servicoId) if both exist
        if (prestadorId && linha.servicoId) {
          await query(
            `INSERT INTO public."_PartnerToService" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [prestadorId, linha.servicoId]
          );
        }
      }
    }

    // Fetch the complete venda with linhas
    const vendaWithLinhas = await query(
      `SELECT v.*, 
              json_agg(json_build_object('id', l.id, 'servicoId', l."servicoId", 'precoOriginal', l."precoOriginal", 'preco', l.preco, 'quantidade', l.quantidade)) as linhas
       FROM "VendaLg" v
       LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
       WHERE v.id = $1
       GROUP BY v.id`,
      [id]
    );

    return NextResponse.json(sanitizeData(vendaWithLinhas[0]), { status: 201 });
  } catch (error) {
    console.error("POST /api/vendas-lg error:", error);
    return NextResponse.json(
      { error: "Falha ao criar venda" },
      { status: 500 }
    );
  }
}
