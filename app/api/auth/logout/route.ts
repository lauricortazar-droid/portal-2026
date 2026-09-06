import { NextResponse } from "next/server";
import { sessionCookieName } from "../../../chatgpt-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const candidate = url.searchParams.get("return_to") ?? "/";
  const returnTo = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(sessionCookieName, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
