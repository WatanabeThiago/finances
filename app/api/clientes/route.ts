import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";

    let whereClause = "";
    let params: any[] = [];

    if (search) {
      whereClause = `WHERE c.nome ILIKE $1 OR c.telefone ILIKE $1 OR c.documento ILIKE $1`;
      params.push(`%${search}%`);
    }

    const sql = `
      SELECT 
        c.telefone,
        c.nome,
        c.documento,
        c."createdAt",
        c."updatedAt",
        COALESCE(COUNT(DISTINCT v.id), 0)::int AS "totalVendas",
        COALESCE(SUM(l.preco * l.quantidade), 0)::float AS "faturamento"
      FROM public."Cliente" c
      LEFT JOIN public."VendaLg" v ON (
        TRIM(v."clienteTelefone") = TRIM(c.telefone)
        OR (
          (v."clienteTelefone" IS NULL OR TRIM(v."clienteTelefone") = '') 
          AND LOWER(TRIM(v."clienteNome")) = LOWER(TRIM(c.nome))
        )
      )
      LEFT JOIN public."VendaLgLine" l ON l."vendaLgId" = v.id
      ${whereClause}
      GROUP BY c.telefone, c.nome, c.documento, c."createdAt", c."updatedAt"
      ORDER BY "faturamento" DESC, c."updatedAt" DESC
    `;

    const result = await query(sql, params);
    return NextResponse.json(sanitizeData(result));
  } catch (error) {
    console.error("GET /api/clientes error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar clientes" },
      { status: 500 }
    );
  }
}
