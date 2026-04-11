import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM public."DailyAds" ORDER BY data DESC`
    );
    return NextResponse.json(sanitizeData(result));
  } catch (error) {
    console.error("GET /api/daily-ads error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar dados" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
    } = body;

    if (!data) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    const result = await query(
      `INSERT INTO public."DailyAds" (
        id, data, "entradaReal", "gastosGoogleAds", clientes, cac, "ticketMedio", cpc, resultado, comissao, "resultadoComissao", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
      )
      RETURNING *`,
      [
        id,
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
      ]
    );

    return NextResponse.json(sanitizeData(result[0]));
  } catch (error) {
    console.error("POST /api/daily-ads error:", error);
    return NextResponse.json(
      { error: "Falha ao criar registro" },
      { status: 500 }
    );
  }
}
