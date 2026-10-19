import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình ADMIN_PASSWORD trên Vercel." },
      { status: 503 },
    );
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const suppliedPassword = typeof body.password === "string" ? body.password : "";
  if (suppliedPassword.length !== configuredPassword.length || suppliedPassword !== configuredPassword) {
    return NextResponse.json({ ok: false, error: "Mật khẩu không đúng. Vui lòng thử lại." }, { status: 401 });
  }

  // This endpoint verifies the secret server-side. The current app uses a client-side
  // UI gate; secure database write access must additionally be enforced with Supabase RLS.
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
