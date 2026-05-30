import { NextResponse } from "next/server";
import { createStandardImportWorkbookBuffer } from "@/lib/standard-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = await createStandardImportWorkbookBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": "attachment; filename*=UTF-8''ye-swim-standard-import.xlsx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "no-store"
    }
  });
}
