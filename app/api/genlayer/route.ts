import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import manifest from "@/deployment-manifest.public.json";

export const dynamic = "force-dynamic";

const client = createClient({ chain: studionet, endpoint: manifest.rpc });
const allowed = new Map<string, Set<string>>([
  [manifest.contracts.publisherLedger.toLowerCase(), new Set(["list_source_keys", "get_source_json", "list_snapshot_keys", "get_snapshot_json"])],
  [manifest.contracts.covenantBook.toLowerCase(), new Set(["list_covenant_keys", "get_covenant_json", "get_active_covenant_key", "is_covenant_claimable"])],
  [manifest.contracts.adjudicator.toLowerCase(), new Set(["list_case_keys", "get_case_json"])],
  [manifest.contracts.mandateRouter.toLowerCase(), new Set(["list_mandate_keys", "get_mandate_json", "get_adapter_json"])],
  [manifest.contracts.serviceControl.toLowerCase(), new Set(["get_status_json", "get_applied_mandate_digest", "get_operation_json"])],
]);

function failure(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return failure("request body must be JSON"); }
  if (!input || typeof input !== "object") return failure("invalid request body");
  const body = input as Record<string, unknown>;
  try {
    if (body.operation === "read") {
      const address = String(body.address || "").toLowerCase();
      const functionName = String(body.functionName || "");
      const args = body.args;
      if (!/^0x[0-9a-f]{40}$/.test(address) || !allowed.get(address)?.has(functionName)) return failure("contract read is not allowed", 403);
      if (!Array.isArray(args) || args.length > 12) return failure("invalid contract arguments");
      const result = await client.readContract({ address: address as `0x${string}`, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL } as never);
      return Response.json({ result }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.operation === "transaction") {
      const hash = String(body.hash || "").toLowerCase();
      if (!/^0x[0-9a-f]{64}$/.test(hash)) return failure("invalid transaction hash");
      const transaction = await client.getTransaction({ hash: hash as never });
      const serializable = JSON.parse(JSON.stringify(transaction, (_key, value) => typeof value === "bigint" ? value.toString() : value));
      return Response.json({ transaction: serializable }, { headers: { "Cache-Control": "no-store" } });
    }
    return failure("unsupported operation");
  } catch (cause) {
    return failure(cause instanceof Error ? cause.message : "GenLayer request failed", 502);
  }
}
