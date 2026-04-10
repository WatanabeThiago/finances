import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(
      "SELECT * FROM \"Partner\" ORDER BY \"createdAt\" DESC"
    );
    return NextResponse.json(sanitizeData(result));
  } catch (error) {
    console.error("GET /api/parceiros error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar parceiros" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nome,
      endereco,
      latitude,
      longitude,
      automotivo,
      residencial,
      fotoDataUrl,
    } = body;

    if (!nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const result = await query(
      `INSERT INTO "Partner" (id, nome, endereco, latitude, longitude, automotivo, residencial, "fotoDataUrl", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        id,
        nome,
        endereco || null,
        latitude || null,
        longitude || null,
        automotivo || false,
        residencial || false,
        fotoDataUrl || null,
      ]
    );

    return NextResponse.json(sanitizeData(result[0]), { status: 201 });
  } catch (error) {
    console.error("POST /api/parceiros error:", error);
    return NextResponse.json(
      { error: "Falha ao criar parceiro" },
      { status: 500 }
    );
  }
}
