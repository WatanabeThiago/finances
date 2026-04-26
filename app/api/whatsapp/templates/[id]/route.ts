import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await query(`DELETE FROM public.whatsapp_templates WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { active } = await request.json();
  const rows = await query(
    `UPDATE public.whatsapp_templates SET active = $1 WHERE id = $2
     RETURNING id, text, active`,
    [active, id]
  );
  return NextResponse.json(rows[0]);
}
