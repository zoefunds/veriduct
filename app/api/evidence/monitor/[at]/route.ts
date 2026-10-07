import { monitorEvidence, parseObservationTime } from "@/lib/evidence";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ at: string }> }) {
  const at = parseObservationTime((await params).at);
  if (at === null) return Response.json({ error: "A valid unix observation time is required." }, { status: 400 });
  return Response.json(monitorEvidence(at));
}
