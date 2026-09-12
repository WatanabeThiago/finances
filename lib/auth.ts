import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "auth_token";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "finances_app_jwt_super_secret_key_2026_safe_fallback"
);

export interface TokenPayload {
  sub: string;
  username: string;
  name?: string;
}

/**
 * Cria um token JWT assinado valido por 30 dias
 */
export async function signAuthToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({
    username: payload.username,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Valida o token JWT e retorna o payload caso valido
 */
export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || typeof payload.username !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      username: payload.username,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}
