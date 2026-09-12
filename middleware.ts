import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// Rotas públicas que não requerem autenticação
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/tracking",
  "/api/contact-requests",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir arquivos estáticos, favicon e Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Verificar se a rota atual é pública
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const userPayload = token ? await verifyAuthToken(token) : null;
  const isAuthenticated = Boolean(userPayload);

  // Se o usuário já está logado e acessa /login, redireciona para o dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Se a rota for pública (ex: tracking de leads), libera
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Se não estiver autenticado
  if (!isAuthenticated) {
    // Se for requisição de API privada, retorna 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login para continuar." },
        { status: 401 }
      );
    }

    // Se for página, redireciona para /login lembrando a página de destino
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};