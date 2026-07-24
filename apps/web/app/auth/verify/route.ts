import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=Link+inv%C3%A1lido", appUrl));
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.session_token) {
      const detail = typeof data?.detail === "string" ? data.detail : "Link inválido ou expirado.";
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(detail)}`, appUrl));
    }

    const store = await cookies();
    store.set(SESSION_COOKIE, data.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return NextResponse.redirect(new URL("/", appUrl));
  } catch {
    return NextResponse.redirect(
      new URL("/auth/login?error=N%C3%A3o+foi+poss%C3%ADvel+conectar+%C3%A0+API", appUrl)
    );
  }
}
