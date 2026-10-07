import { monitorEvidence, parseObservationTime } from "@/lib/evidence";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const at = parseObservationTime(new URL(request.url).searchParams.get("at") || "");
  if (at === null) return Response.json({ error: "A valid unix observation time is required." }, { status: 400 });
  return Response.json(monitorEvidence(at));
}
