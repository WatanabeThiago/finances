import { NextRequest, NextResponse } from "next/server";
import { getSessionStatus, startSession } from "@/lib/waha-client";

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action");

    if (action === "init") {
      const session = await startSession();
      if (!session) {
        return NextResponse.json(
          { success: false, error: "WAHA não disponível" },
          { status: 503 }
        );
      }
      return NextResponse.json({ success: true, session });
    }

    const session = await getSessionStatus();
    return NextResponse.json({
      success: true,
      isReady: session?.status === "WORKING",
      status: session?.status ?? "STOPPED",
      me: session?.me ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
