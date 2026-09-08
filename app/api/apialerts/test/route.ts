import { sendApiAlert } from "@/lib/apialerts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  const result = await sendApiAlert({
    event: "test.notification",
    title: "🔔 Teste de Notificação",
    message: "O sistema de notificações push do Chaveiro 24h está conectado e funcionando perfeitamente!",
    tags: ["teste", "sistema"],
    link: "https://finances-beige.vercel.app/tracking",
    data: {
      horario: new Date().toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
    },
  });

  return Response.json(result, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message =
      body.message ||
      "Teste de notificação manual disparado com sucesso via painel!";

    const result = await sendApiAlert({
      event: "test.manual",
      title: body.title || "🔔 Teste Manual",
      message,
      tags: ["teste", "manual"],
      link: "https://finances-beige.vercel.app/tracking",
      data: body.data || {},
    });

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
