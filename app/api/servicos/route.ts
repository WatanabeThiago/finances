import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const services = await query(
      `SELECT * FROM public."Service" ORDER BY "createdAt" DESC`
    );
    const partnerRelations = await query(
      `SELECT * FROM public."_PartnerToService"`
    );
    const productRelations = await query(
      `SELECT * FROM public."_ProdutoToService"`
    );

    const servicesWithRelations = services.map((s: any) => {
      const prestadorIds = partnerRelations
        .filter((r: any) => r.B === s.id)
        .map((r: any) => r.A);
      const produtoIds = productRelations
        .filter((r: any) => r.B === s.id)
        .map((r: any) => r.A);
      return {
        ...s,
        prestadorIds,
        produtoIds,
      };
    });

    return NextResponse.json(sanitizeData(servicesWithRelations));
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
      prestadorIds,
      produtoIds,
      ferramentas,
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
        residencial,
        ferramentas
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
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
        ferramentas || "",
      ]
    );

    const newService = rows[0];

    // Insert partner relations
    if (Array.isArray(prestadorIds) && prestadorIds.length > 0) {
      for (const pId of prestadorIds) {
        await query(
          `INSERT INTO public."_PartnerToService" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [pId, newService.id]
        );
      }
    }

    // Insert product relations
    if (Array.isArray(produtoIds) && produtoIds.length > 0) {
      for (const prId of produtoIds) {
        await query(
          `INSERT INTO public."_ProdutoToService" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [prId, newService.id]
        );
      }
    }

    return NextResponse.json(
      sanitizeData({
        ...newService,
        prestadorIds: prestadorIds || [],
        produtoIds: produtoIds || [],
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

