import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query(
      `SELECT * FROM public."Service" WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
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
      valor,
      valorNoturno,
      gastosEstimados,
      observacoes,
      fotoDataUrl,
      automotivo,
      residencial,
    } = body;

    const rows = await query(
      `UPDATE public."Service"
      SET 
        nome = $1,
        valor = $2,
        "valorNoturno" = $3,
        "gastosEstimados" = $4,
        observacoes = $5,
        "fotoDataUrl" = $6,
        automotivo = $7,
        residencial = $8,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $9
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
        id,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query(
      `DELETE FROM public."Service" WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
