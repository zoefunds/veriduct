export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const at = Number(new URL(request.url).searchParams.get("at"));
  if (!Number.isInteger(at) || at < 1) return Response.json({ error: "A valid unix observation time is required." }, { status: 400 });
  return Response.json({ service:"VERIDUCT Demo Payments API", publisher:"provider-operations", observed_at:at, window_minutes:30, availability_percent:91.4, p95_latency_ms:4820, error_rate_percent:8.6, status:"major_outage", regions_affected:["lagos-edge","accra-edge"], maintenance_scheduled:false });
}
