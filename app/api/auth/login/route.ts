import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName } from "../../../chatgpt-auth";
import { configuredAdminEmails } from "../../../lib/directory-store";

function safeReturnTo(value: FormDataEntryValue | null) {
  const candidate = typeof value === "string" ? value : "/portal";
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/portal";
}

function matchesCode(supplied: string, expected: string | undefined) {
  if (!supplied || !expected) return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const code = String(form.get("code") ?? "");
  const returnTo = safeReturnTo(form.get("return_to"));
  const isAdmin = configuredAdminEmails().includes(email);
  const expectedCode = isAdmin ? process.env.FGDLL_ADMIN_ACCESS_CODE : process.env.FGDLL_PORTAL_ACCESS_CODE;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !matchesCode(code, expectedCode)) {
    const accessType = isAdmin ? "admin" : "portal";
    return NextResponse.redirect(new URL(`/ingresar?error=${accessType}&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(sessionCookieName, createSessionToken(email, name || email), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 12 * 60 * 60,
  });
  return response;
}
