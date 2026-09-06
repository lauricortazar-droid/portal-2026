import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const SESSION_COOKIE = "fgdll_session";
const SIGN_IN_PATH = "/ingresar";
const SIGN_OUT_PATH = "/api/auth/logout";

type SessionPayload = { email: string; name: string; exp: number };

function sessionSecret() {
  const value = process.env.FGDLL_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("FGDLL_SESSION_SECRET no está configurado.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(email: string, name: string) {
  const payload = Buffer.from(JSON.stringify({
    email: email.trim().toLowerCase(),
    name: name.trim() || email.trim().toLowerCase(),
    exp: Date.now() + 12 * 60 * 60 * 1000,
  } satisfies SessionPayload)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function readSessionToken(value: string): SessionPayload | null {
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = signature(payload);
  const left = Buffer.from(suppliedSignature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (!decoded.email || !decoded.name || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const sessionCookieName = SESSION_COOKIE;

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const session = readSessionToken(value);
  if (!session) return null;
  return { displayName: session.name, email: session.email, fullName: session.name };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  let url: URL;
  try { url = new URL(value, "https://app.local"); } catch { return "/"; }
  if (url.origin !== "https://app.local" || isReservedAuthPath(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname === SIGN_OUT_PATH || pathname.startsWith("/api/auth/");
}
