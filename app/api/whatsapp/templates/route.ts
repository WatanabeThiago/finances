import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const rows = await query(
    `SELECT id, text, active, "createdAt" as created_at
     FROM public.whatsapp_templates
     ORDER BY "createdAt" ASC`
  );
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  }
  try {
    const rows = await query(
      `INSERT INTO public.whatsapp_templates (text)
       VALUES ($1)
       RETURNING id, text, active, "createdAt" as created_at`,
      [text.trim()]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Template já existe" }, { status: 409 });
  }
}
