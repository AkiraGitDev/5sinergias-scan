import { NextResponse } from "next/server";
import { analyzeImage } from "@/lib/gemini";
import { AMBIENTES, type AmbienteKey } from "@/lib/types";

export const maxDuration = 60;

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("photo");
    const ambiente = form.get("ambiente");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Foto não enviada" },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Foto maior que 10MB" },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Formato ${file.type} não suportado` },
        { status: 400 },
      );
    }
    if (
      typeof ambiente !== "string" ||
      !(ambiente in AMBIENTES)
    ) {
      return NextResponse.json(
        { error: "Ambiente inválido" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const t0 = Date.now();
    const { model, result } = await analyzeImage(
      base64,
      file.type,
      ambiente as AmbienteKey,
    );
    const elapsedMs = Date.now() - t0;

    return NextResponse.json({ model, elapsedMs, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/scan]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
