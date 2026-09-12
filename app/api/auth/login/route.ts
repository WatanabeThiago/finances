import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      return NextResponse.json(
        { error: "Usuário ou senha inválidos" },
        { status: 401 }
      );
    }

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