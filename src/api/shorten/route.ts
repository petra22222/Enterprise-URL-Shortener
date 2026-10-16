import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid"; // অথবা র্যান্ডম স্ট্রিং জেনারেটর

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { originalUrl, customAlias } = await req.json();

    if (!originalUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // ইউনিক শর্ট কোড তৈরি (অথবা কাস্টম এলিয়াস ব্যবহার করা)
    const shortCode = customAlias || nanoid(6);
    const domain = "localhost:3000";

    const newLink = await prisma.link.create({
      data: {
        originalUrl,
        shortCode,
        domain,
      },
    });

    return NextResponse.json({ success: true, link: newLink });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}