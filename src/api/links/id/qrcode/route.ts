// FILE: src/app/api/links/[id]/qrcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Authentication required.");
  
  const link = await prisma.link.findUnique({ where: { id: params.id } });
  if (!link || link.ownerId !== user.id) return jsonError(404, "Link not found.");

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const size = Math.min(1024, Math.max(128, Number(searchParams.get("size")) || 320));
  const ec = (["L", "M", "Q", "H"].includes(searchParams.get("ec") || "") ? searchParams.get("ec") : "M") as QRCode.QRCodeErrorCorrectionLevel;

  const protocol = link.domain.includes("localhost") ? "http" : "https";
  const shortUrl = `${protocol}://${link.domain}/${link.shortCode}`;

  if (format === "svg") {
    const svg = await QRCode.toString(shortUrl, { type: "svg", width: size, errorCorrectionLevel: ec });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="${link.shortCode}.svg"` },
    });
  }

  const buffer = await QRCode.toBuffer(shortUrl, { type: "png", width: size, errorCorrectionLevel: ec });
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${link.shortCode}.png"` },
  });
}
