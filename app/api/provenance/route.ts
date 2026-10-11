import { evidenceProvenance } from "@/lib/evidence";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(evidenceProvenance, {
    headers: { "Cache-Control": "no-store" },
  });
}
