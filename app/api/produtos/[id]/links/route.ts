import { query, sanitizeData } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await query(
      `SELECT * FROM public."ProdutoLink"
       WHERE "produtoId" = $1
       ORDER BY (preco / COALESCE(NULLIF(quantidade, 0), 1)) ASC`,
      [id]
    );
    return NextResponse.json(sanitizeData(rows));
  } catch (error) {
    console.error("Error fetching produto links:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { url, fornecedor, preco, quantidade, frete } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const rows = await query(
      `INSERT INTO public."ProdutoLink" (
        "produtoId", url, fornecedor, preco, quantidade, frete
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        id,
        url.trim(),
        (fornecedor || "").trim(),
        parseFloat(preco) || 0,
        parseInt(quantidade, 10) || 1,
        parseFloat(frete) || 0,
      ]
    );

    return NextResponse.json(sanitizeData(rows[0]), { status: 201 });
  } catch (error) {
    console.error("Error creating produto link:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
) {
  try {
    const linkId = req.nextUrl.searchParams.get("linkId");
    if (!linkId) {
      return NextResponse.json(
        { error: "linkId query param is required" },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM public."ProdutoLink" WHERE id = $1`,
      [linkId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting produto link:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
