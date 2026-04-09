import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await query(
      `SELECT * FROM public."Service" ORDER BY "createdAt" DESC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nome,
      valor,
      valorNoturno,
      gastosEstimados,
      observacoes,
      fotoDataUrl,
      automotivo,
      residencial,
    } = body;

    const rows = await query(
      `INSERT INTO public."Service" (
        nome,
        valor,
        "valorNoturno",
        "gastosEstimados",
        observacoes,
        "fotoDataUrl",
        automotivo,
        residencial
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING *`,
      [
        nome,
        parseFloat(valor),
        parseFloat(valorNoturno),
        parseFloat(gastosEstimados),
        observacoes || "",
        fotoDataUrl || null,
        automotivo || false,
        residencial || false,
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
