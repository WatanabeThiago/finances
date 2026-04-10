import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      'SELECT * FROM "Partner" WHERE id = $1',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Parceiro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(result[0]));
  } catch (error) {
    console.error("GET /api/parceiros/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar parceiro" },
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

    const result = await query(
      `UPDATE "Partner" 
       SET nome = $1, endereco = $2, latitude = $3, longitude = $4, automotivo = $5, residencial = $6, "fotoDataUrl" = $7, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        nome,
        endereco || null,
        latitude || null,
        longitude || null,
        automotivo || false,
        residencial || false,
        fotoDataUrl || null,
        id,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Parceiro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(result[0]));
  } catch (error) {
    console.error("PUT /api/parceiros/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar parceiro" },
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
      'DELETE FROM "Partner" WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Parceiro não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/parceiros/[id] error:", error);
    return NextResponse.json(
      { error: "Falha ao deletar parceiro" },
      { status: 500 }
    );
  }
}
