export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const at = Number(new URL(request.url).searchParams.get("at"));
  if (!Number.isInteger(at) || at < 1) return Response.json({ error: "A valid unix observation time is required." }, { status: 400 });
  return Response.json({ service:"VERIDUCT Demo Payments API", publisher:"independent-observer", observed_at:at, window_minutes:30, successful_checks:274, total_checks:300, availability_percent:91.33, median_latency_ms:3910, status:"degraded", finding:"Sustained availability below 95 percent across two independent regions." });
}
