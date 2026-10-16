// FILE: src/lib/api-helpers.ts
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function withErrorHandler(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err: any) {
    if (err instanceof ApiError) return jsonError(err.status, err.message);
    console.error("Unhandled API error:", err);
    return jsonError(500, "An unexpected error occurred. Please try again.");
  }
}
     

export function verifySameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(req.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}