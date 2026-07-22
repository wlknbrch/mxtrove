import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { config } from "../config.js";

const JWKS = createRemoteJWKSet(new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`));

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: string | null;
  raw: JWTPayload;
}

export async function verifySupabaseBearerToken(authorizationHeader?: string | null): Promise<AuthenticatedUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("Missing bearer token.");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  const verification = await jwtVerify(token, JWKS, {
    issuer: `${config.supabaseUrl}/auth/v1`,
  });

  const id = typeof verification.payload.sub === "string" ? verification.payload.sub : null;
  if (!id) {
    throw new Error("Supabase JWT is missing the subject claim.");
  }

  return {
    id,
    email: typeof verification.payload.email === "string" ? verification.payload.email : null,
    role: typeof verification.payload.role === "string" ? verification.payload.role : null,
    raw: verification.payload,
  };
}
