import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData, initializeDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apenasAtivos = searchParams.get("ativo");

    let sql = `SELECT id, nome, valor, categoria, "diaVencimento", ativo, observacoes, "createdAt", "updatedAt" FROM public."ContaFixa"`;
    const params: unknown[] = [];

    if (apenasAtivos === "true") {
      sql += ` WHERE ativo = true`;
    }

    sql += ` ORDER BY "diaVencimento" ASC, nome ASC`;

    try {
      const rows = await query(sql, params);
      return NextResponse.json(sanitizeData(rows));
    } catch (queryErr: any) {
      if (queryErr.message?.includes("does not exist")) {
        await initializeDatabase();
        const rows = await query(sql, params);
        return NextResponse.json(sanitizeData(rows));
      }
      throw queryErr;
    }
  } catch (error: any) {
    console.error("Error fetching contas fixas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar contas fixas", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, valor, categoria, diaVencimento, ativo, observacoes } = body;

    const parsedValor = typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ error: "Nome da conta é obrigatório." }, { status: 400 });
    }

    if (!parsedValor || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json({ error: "Valor inválido. Deve ser maior que 0." }, { status: 400 });
    }

    const cleanNome = nome.trim();
    const cleanCategoria = (categoria || "Outros").trim();
    const cleanDia = Math.max(1, Math.min(31, parseInt(diaVencimento, 10) || 10));
    const cleanAtivo = ativo !== undefined ? Boolean(ativo) : true;
    const cleanObs = (observacoes || "").trim();

    const insertSql = `
      INSERT INTO public."ContaFixa" (nome, valor, categoria, "diaVencimento", ativo, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, valor, categoria, "diaVencimento", ativo, observacoes, "createdAt", "updatedAt"
    `;

    try {
      const rows = await query(insertSql, [
        cleanNome,
        parsedValor,
        cleanCategoria,
        cleanDia,
        cleanAtivo,
        cleanObs,
      ]);
      return NextResponse.json(sanitizeData(rows[0]), { status: 201 });
    } catch (insertErr: any) {
      if (insertErr.message?.includes("does not exist")) {
        await initializeDatabase();
        const rows = await query(insertSql, [
          cleanNome,
          parsedValor,
          cleanCategoria,
          cleanDia,
          cleanAtivo,
          cleanObs,
        ]);
        return NextResponse.json(sanitizeData(rows[0]), { status: 201 });
      }
      throw insertErr;
    }
  } catch (error: any) {
    console.error("Error creating conta fixa:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta fixa", details: error.message },
      { status: 500 }
    );
  }
}
