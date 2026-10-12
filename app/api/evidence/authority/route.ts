import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const SOURCES = {
  usgs: {
    source_key: "usgs-origin",
    url: "https://earthquake.usgs.gov/product/origin/us6000qw60/us/1760216255040/quakeml.xml",
    observed_at: 1753831492,
    event: "M8.8 2025 Kamchatka Peninsula earthquake",
  },
  emsc: {
    source_key: "emsc-catalog",
    url: "https://www.seismicportal.eu/fdsnws/event/1/query?catalog=EMSC-RTS&source_id=1838723&format=json",
    observed_at: 1753831491,
    event: "M8.8 2025 Kamchatka Peninsula earthquake",
  },
} as const;

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("source") as keyof typeof SOURCES | null;
  const source = key ? SOURCES[key] : undefined;
  if (!source) return Response.json({ error: "source must be usgs or emsc" }, { status: 400 });
  const response = await fetch(source.url, { cache: "no-store", headers: { accept: "application/json, application/xml, text/xml;q=0.9, */*;q=0.8" } });
  if (!response.ok) return Response.json({ error: `authority returned HTTP ${response.status}` }, { status: 502 });
  const bytes = Buffer.from(await response.arrayBuffer());
  return Response.json({ ...source, content_digest: createHash("sha256").update(bytes).digest("hex"), byte_length: bytes.length, fetched_at: Math.floor(Date.now() / 1000), valid_for_seconds: 2592000 });
}
