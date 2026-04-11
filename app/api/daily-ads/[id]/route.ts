import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT * FROM public."DailyAds" WHERE id = $1`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(result[0]));
  } catch (error) {
    console.error("GET /api/daily-ads/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar registro" },
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
      data,
      entradaReal,
      gastosGoogleAds,
      clientes,
      cac,
      ticketMedio,
      cpc,
      resultado,
      comissao,
      resultadoComissao,
    } = body;

    const result = await query(
      `UPDATE public."DailyAds"
       SET data = $1, "entradaReal" = $2, "gastosGoogleAds" = $3, clientes = $4, cac = $5, "ticketMedio" = $6, cpc = $7, resultado = $8, comissao = $9, "resultadoComissao" = $10, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        data,
        parseFloat(entradaReal),
        parseFloat(gastosGoogleAds),
        parseInt(clientes, 10),
        parseFloat(cac),
        parseFloat(ticketMedio),
        parseFloat(cpc),
        parseFloat(resultado),
        parseFloat(comissao) || 0,
        parseFloat(resultadoComissao) || 0,
        id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(result[0]));
  } catch (error) {
    console.error("PUT /api/daily-ads/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar registro" },
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
    
    const result = await query(
      `DELETE FROM public."DailyAds" WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/daily-ads/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao deletar registro" },
      { status: 500 }
    );
  }
}
