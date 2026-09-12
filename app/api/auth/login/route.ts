import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const MAX_LOGIN_ATTEMPTS = 20;
const RATE_LIMIT_WINDOW_MINUTES = 15;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Garantir tabela criada (caso initializeDatabase ainda não tenha rodado)
    await query(
      `CREATE TABLE IF NOT EXISTS public."login_attempts" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ip TEXT NOT NULL,
        "attemptedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    );

    // Limpeza periódica de registros com mais de 24 horas para manter tabela enxuta
    query(
      `DELETE FROM public."login_attempts" WHERE "attemptedAt" < NOW() - INTERVAL '24 hours'`
    ).catch(() => {});

    // Contar tentativas recentes deste IP nos últimos 15 minutos
    const countRows = await query(
      `SELECT COUNT(*)::int as count 
       FROM public."login_attempts" 
       WHERE ip = $1 AND "attemptedAt" >= NOW() - INTERVAL '15 minutes'`,
      [ip]
    );

    const attempts = Number(countRows[0]?.count || 0);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de login (${attempts}/${MAX_LOGIN_ATTEMPTS}). Aguarde ${RATE_LIMIT_WINDOW_MINUTES} minutos antes de tentar novamente.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const trimmedUser = String(username).trim();

    // Buscar usuário no banco
    const rows = await query(
      `SELECT id, username, password_hash, name FROM public."User" WHERE username = $1`,
      [trimmedUser]
    );

    if (rows.length === 0) {
      // Registrar tentativa inválida
      await query(
        `INSERT INTO public."login_attempts" (ip) VALUES ($1)`,
        [ip]
      );
      return NextResponse.json(
        { error: "Usuário ou senha inválidos" },
        { status: 401 }
      );
    }

    const user = rows[0] as {
      id: string;
      username: string;
      password_hash: string;
      name?: string;
    };

    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      // Registrar tentativa inválida
      await query(
        `INSERT INTO public."login_attempts" (ip) VALUES ($1)`,
        [ip]
      );
      return NextResponse.json(
        { error: "Usuário ou senha inválidos" },
        { status: 401 }
      );
    }

    // Login com sucesso: limpa o histórico de falhas do IP
    await query(
      `DELETE FROM public."login_attempts" WHERE ip = $1`,
      [ip]
    );

    const token = await signAuthToken({
      sub: user.id,
      username: user.username,
      name: user.name || "Thiago",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao realizar login" },
      { status: 500 }
    );
  }
}