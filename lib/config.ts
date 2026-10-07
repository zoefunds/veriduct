import manifest from "@/deployment-manifest.public.json";

export const NETWORK = { name: "GenLayer Studionet", chainId: 61999, rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api", explorer: process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || "https://explorer-studio.genlayer.com" } as const;

type Address = `0x${string}` | "";
const saved = manifest.contracts as Record<string, Address>;
export const ADDRESSES = {
  publisherLedger: (process.env.NEXT_PUBLIC_PUBLISHER_LEDGER_ADDRESS || saved.publisherLedger || "") as Address,
  covenantBook: (process.env.NEXT_PUBLIC_COVENANT_BOOK_ADDRESS || saved.covenantBook || "") as Address,
  adjudicator: (process.env.NEXT_PUBLIC_ADJUDICATOR_ADDRESS || saved.adjudicator || "") as Address,
  mandateRouter: (process.env.NEXT_PUBLIC_MANDATE_ROUTER_ADDRESS || saved.mandateRouter || "") as Address,
  serviceControl: (process.env.NEXT_PUBLIC_SERVICE_CONTROL_ADDRESS || saved.serviceControl || "") as Address,
};
export const SERVICE_GOVERNANCE = manifest.deployer as `0x${string}`;
export const configured = Object.values(ADDRESSES).every(Boolean);
export const explorerTx = (hash: string) => `${NETWORK.explorer}/tx/${hash}`;
