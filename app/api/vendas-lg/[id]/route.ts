import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT v.*, 
              json_agg(json_build_object('id', l.id, 'servicoId', l."servicoId", 'precoOriginal', l."precoOriginal", 'preco', l.preco, 'quantidade', l.quantidade)) as linhas
       FROM "VendaLg" v
       LEFT JOIN "VendaLgLine" l ON l."vendaLgId" = v.id
       WHERE v.id = $1
       GROUP BY v.id`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Venda não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(result[0]));
  } catch (error) {
    console.error("GET /api/vendas-lg/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar venda" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      clienteNome,
      clienteTelefone,
      clienteDoc,
      endereco,
      latitude,
      longitude,
      prestadorId,
      comissao,
      comissaoPaga,
      dataVenda,
      linhas,
    } = body;

    if (!clienteNome) {
      return NextResponse.json(
        { error: "Nome do cliente é obrigatório" },
        { status: 400 }
      );
    }

    // Update main venda record
    const result = await query(
      `UPDATE "VendaLg" 
       SET "clienteNome" = $1, "clienteTelefone" = $2, "clienteDoc" = $3, endereco = $4, latitude = $5, longitude = $6, "prestadorId" = $7, comissao = $8, "comissaoPaga" = $9, "dataVenda" = $10, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        clienteNome,
        clienteTelefone || null,
        clienteDoc || null,
        endereco || null,
        latitude || null,
        longitude || null,
        prestadorId || null,
        comissao || null,
        comissaoPaga || false,
        dataVenda || new Date().toISOString(),
        id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Venda não encontrada" },
        { status: 404 }
      );
    }

    // Delete old linhas and insert new ones
    await query('DELETE FROM "VendaLgLine" WHERE "vendaLgId" = $1', [id]);

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

    return NextResponse.json(sanitizeData(vendaWithLinhas[0]));
  } catch (error) {
    console.error("PUT /api/vendas-lg/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar venda" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete linhas first
    await query('DELETE FROM "VendaLgLine" WHERE "vendaLgId" = $1', [id]);
    
    // Delete venda
    const result = await query(
      'DELETE FROM "VendaLg" WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Venda não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: result[0].id });
  } catch (error) {
    console.error("DELETE /api/vendas-lg/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao deletar venda" },
      { status: 500 }
    );
  }
}
