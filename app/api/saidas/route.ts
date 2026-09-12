import { NextRequest, NextResponse } from "next/server";
import { query, sanitizeData, initializeDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get("categoria");
    const de = searchParams.get("de"); // data inicial ISO ou YYYY-MM-DD
    const ate = searchParams.get("ate"); // data final ISO ou YYYY-MM-DD

    let sql = `SELECT id, valor, categoria, descricao, "formaPagamento", "dataSaida", "createdAt", "updatedAt" FROM public."Saida" WHERE 1=1`;
    const params: unknown[] = [];
    let pIdx = 1;

    if (categoria && categoria !== "all") {
      sql += ` AND categoria = $${pIdx++}`;
      params.push(categoria);
    }

    if (de) {
      sql += ` AND "dataSaida" >= $${pIdx++}`;
      params.push(new Date(de));
    }

    if (ate) {
      sql += ` AND "dataSaida" <= $${pIdx++}`;
      params.push(new Date(ate));
    }

    sql += ` ORDER BY "dataSaida" DESC, "createdAt" DESC`;

    try {
      const rows = await query(sql, params);
      return NextResponse.json(sanitizeData(rows));
    } catch (queryErr: any) {
      // Se a tabela ainda não existir por algum motivo, inicializa e tenta de novo
      if (queryErr.message?.includes("does not exist")) {
        await initializeDatabase();
        const rows = await query(sql, params);
        return NextResponse.json(sanitizeData(rows));
      }
      throw queryErr;
    }
  } catch (error: any) {
    console.error("Error fetching saidas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar saídas", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { valor, categoria, descricao, formaPagamento, dataSaida } = body;

    const parsedValor = typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);

    if (!parsedValor || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json(
        { error: "Valor inválido. Deve ser maior que 0." },
        { status: 400 }
      );
    }

    if (!categoria || typeof categoria !== "string" || !categoria.trim()) {
      return NextResponse.json(
        { error: "Categoria é obrigatória." },
        { status: 400 }
      );
    }

    const cleanCategoria = categoria.trim();
    const cleanDescricao = (descricao || "").trim();
    const cleanFormaPagamento = (formaPagamento || "Pix").trim();
    const finalDataSaida = dataSaida ? new Date(dataSaida) : new Date();

    const insertSql = `
      INSERT INTO public."Saida" (valor, categoria, descricao, "formaPagamento", "dataSaida")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, valor, categoria, descricao, "formaPagamento", "dataSaida", "createdAt", "updatedAt"
    `;

    try {
      const rows = await query(insertSql, [
        parsedValor,
        cleanCategoria,
        cleanDescricao,
        cleanFormaPagamento,
        finalDataSaida,
      ]);
      return NextResponse.json(sanitizeData(rows[0]), { status: 201 });
    } catch (insertErr: any) {
      if (insertErr.message?.includes("does not exist")) {
        await initializeDatabase();
        const rows = await query(insertSql, [
          parsedValor,
          cleanCategoria,
          cleanDescricao,
          cleanFormaPagamento,
          finalDataSaida,
        ]);
        return NextResponse.json(sanitizeData(rows[0]), { status: 201 });
      }
      throw insertErr;
    }
  } catch (error: any) {
    console.error("Error creating saida:", error);
    return NextResponse.json(
      { error: "Erro ao criar saída", details: error.message },
      { status: 500 }
    );
  }
}
