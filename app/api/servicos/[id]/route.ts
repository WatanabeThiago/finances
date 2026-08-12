import { query, sanitizeData } from "@/lib/db";
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

    const service = rows[0];
    const partnerRelations = await query(
      `SELECT "A" FROM public."_PartnerToService" WHERE "B" = $1`,
      [id]
    );
    const productRelations = await query(
      `SELECT "A" FROM public."_ProdutoToService" WHERE "B" = $1`,
      [id]
    );

    const prestadorIds = partnerRelations.map((r: any) => r.A);
    const produtoIds = productRelations.map((r: any) => r.A);

    return NextResponse.json(
      sanitizeData({
        ...service,
        prestadorIds,
        produtoIds,
      })
    );
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
      prestadorIds,
      produtoIds,
      ferramentas,
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
        ferramentas = $9,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $10
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
        ferramentas || "",
        id,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const updatedService = rows[0];

    // Sync partner relations (only if explicitly provided)
    if (Array.isArray(prestadorIds)) {
      await query(`DELETE FROM public."_PartnerToService" WHERE "B" = $1`, [id]);
      if (prestadorIds.length > 0) {
        for (const pId of prestadorIds) {
          await query(
            `INSERT INTO public."_PartnerToService" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [pId, id]
          );
        }
      }
    }

    // Sync product relations
    await query(`DELETE FROM public."_ProdutoToService" WHERE "B" = $1`, [id]);
    if (Array.isArray(produtoIds) && produtoIds.length > 0) {
      for (const prId of produtoIds) {
        await query(
          `INSERT INTO public."_ProdutoToService" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [prId, id]
        );
      }
    }

    const currentPartnerRelations = await query(
      `SELECT "A" FROM public."_PartnerToService" WHERE "B" = $1`,
      [id]
    );
    const finalPrestadorIds = currentPartnerRelations.map((r: any) => r.A);

    return NextResponse.json(
      sanitizeData({
        ...updatedService,
        prestadorIds: finalPrestadorIds,
        produtoIds: produtoIds || [],
      })
    );
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
