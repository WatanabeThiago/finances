import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query(
      `SELECT * FROM public."Produto" WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Produto not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(rows[0]));
  } catch (error) {
    console.error("Error fetching produto:", error);
    return NextResponse.json(
      { error: "Failed to fetch produto" },
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
      valorCompra,
      fotoDataUrl,
      automotivo,
      residencial,
    } = body;

    const rows = await query(
      `UPDATE public."Produto"
      SET 
        nome = $1,
        valor = $2,
        "fotoDataUrl" = $3,
        automotivo = $4,
        residencial = $5,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
      [
        nome,
        parseFloat(valorCompra) || 0,
        fotoDataUrl || null,
        automotivo || false,
        residencial || false,
        id,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Produto not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sanitizeData(rows[0]));
  } catch (error) {
    console.error("Error updating produto:", error);
    return NextResponse.json(
      { error: "Failed to update produto" },
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
      `DELETE FROM public."Produto" WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting produto:", error);
    return NextResponse.json(
      { error: "Failed to delete produto" },
      { status: 500 }
    );
  }
}
