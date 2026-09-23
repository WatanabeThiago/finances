import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData, initializeDatabase } from "@/lib/db";

// GET /api/fornecedores — lista todos ordenados por nome
export async function GET() {
  try {
    const rows = await query(
      `SELECT id, nome, tipo, categoria, "taxaMes", obs, "createdAt", "updatedAt"
       FROM public."Fornecedor"
       ORDER BY nome ASC`
    );
    return NextResponse.json(sanitizeData(rows));
  } catch (err: any) {
    if (err.message?.includes("does not exist")) {
      await initializeDatabase();
      const rows = await query(
        `SELECT id, nome, tipo, categoria, "taxaMes", obs, "createdAt", "updatedAt"
         FROM public."Fornecedor"
         ORDER BY nome ASC`
      );
      return NextResponse.json(sanitizeData(rows));
    }
    console.error("Erro ao listar fornecedores:", err);
    return NextResponse.json({ error: "Erro ao listar fornecedores" }, { status: 500 });
  }
}

// POST /api/fornecedores — upsert por nome (UK = nome)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nome = (body.nome || "").trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const tipo = (body.tipo || "comum").trim();
    const categoria = body.categoria ? body.categoria.trim() : null;
    const taxaMes = body.taxaMes != null ? Number(body.taxaMes) : null;
    const obs = (body.obs || "").trim();

    const sql = `
      INSERT INTO public."Fornecedor" (nome, tipo, categoria, "taxaMes", obs)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (nome) DO UPDATE
        SET tipo       = COALESCE(EXCLUDED.tipo, public."Fornecedor".tipo),
            categoria  = COALESCE(EXCLUDED.categoria, public."Fornecedor".categoria),
            "taxaMes"  = COALESCE(EXCLUDED."taxaMes", public."Fornecedor"."taxaMes"),
            obs        = COALESCE(NULLIF(EXCLUDED.obs, ''), public."Fornecedor".obs),
            "updatedAt" = CURRENT_TIMESTAMP
      RETURNING id, nome, tipo, categoria, "taxaMes", obs, "createdAt", "updatedAt"
    `;

    try {
      const rows = await query(sql, [nome, tipo, categoria, taxaMes, obs]);
      return NextResponse.json(sanitizeData(rows[0]), { status: 200 });
    } catch (insertErr: any) {
      if (insertErr.message?.includes("does not exist")) {
        await initializeDatabase();
        const rows = await query(sql, [nome, tipo, categoria, taxaMes, obs]);
        return NextResponse.json(sanitizeData(rows[0]), { status: 200 });
      }
      throw insertErr;
    }
  } catch (error: any) {
    console.error("Erro ao salvar fornecedor:", error);
    return NextResponse.json({ error: "Erro ao salvar fornecedor", details: error.message }, { status: 500 });
  }
}
