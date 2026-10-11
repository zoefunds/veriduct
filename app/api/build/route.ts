import manifest from "@/deployment-manifest.public.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    application: manifest.application,
    git_commit: process.env.VERCEL_GIT_COMMIT_SHA || "unavailable-outside-vercel",
    vercel_deployment_id: process.env.VERCEL_DEPLOYMENT_ID || "unavailable-outside-vercel",
    manifest_network: manifest.network,
    manifest_chain_id: manifest.chainId,
  }, { headers: { "Cache-Control": "no-store" } });
}
