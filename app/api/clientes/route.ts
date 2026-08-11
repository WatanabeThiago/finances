import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";

    let sql = `SELECT * FROM public."Cliente"`;
    let params: any[] = [];

    if (search) {
      sql += ` WHERE nome ILIKE $1 OR telefone ILIKE $1`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY "updatedAt" DESC`;

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
