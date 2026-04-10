import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await query(
      `SELECT * FROM public."Produto" ORDER BY "createdAt" DESC`
    );
    return NextResponse.json(sanitizeData(rows));
  } catch (error) {
    console.error("Error fetching produtos:", error);
    return NextResponse.json(
      { error: "Failed to fetch produtos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nome,
      valorCompra,
      fotoDataUrl,
      automotivo,
      residencial,
    } = body;

    const rows = await query(
      `INSERT INTO public."Produto" (
        nome,
        valor,
        "fotoDataUrl",
        automotivo,
        residencial
      ) VALUES (
        $1, $2, $3, $4, $5
      )
      RETURNING *`,
      [
        nome,
        parseFloat(valorCompra) || 0,
        fotoDataUrl || null,
        automotivo || false,
        residencial || false,
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating produto:", error);
    return NextResponse.json(
      { error: "Failed to create produto" },
      { status: 500 }
    );
  }
}
