"use client";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant } from "genlayer-js/types";
import { NETWORK } from "@/lib/config";

type Provider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
declare global { interface Window { ethereum?: Provider } }

export async function connectWallet(): Promise<`0x${string}`> {
  if (!window.ethereum) throw new Error("Install an EIP-1193 wallet to continue.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
  const chainId = String(await window.ethereum.request({ method: "eth_chainId" })).toLowerCase();
  if (chainId !== "0xf22f") {
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xf22f" }] }); }
    catch { await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0xf22f", chainName: "GenLayer Studionet", nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }, rpcUrls: [NETWORK.rpc], blockExplorerUrls: [NETWORK.explorer] }] }); }
  }
  if (!accounts[0]) throw new Error("Wallet returned no account.");
  return accounts[0] as `0x${string}`;
}

export async function readContract<T>(address: string, functionName: string, args: unknown[] = []) {
  if (!address) throw new Error("Deployment address is not configured.");
  const client = createClient({ chain: studionet, endpoint: NETWORK.rpc });
  return await client.readContract({ address: address as `0x${string}`, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL } as never) as T;
}

export async function writeContract(account: `0x${string}`, address: string, functionName: string, args: unknown[]) {
  if (!window.ethereum || !address) throw new Error("Wallet or contract is not configured.");
  const client = createClient({ chain: studionet, account, provider: window.ethereum as never });
  return await client.writeContract({ address: address as `0x${string}`, functionName, args, value: 0n } as never) as `0x${string}`;
}

export async function waitFinalized(hash: `0x${string}`) {
  const client = createClient({ chain: studionet, endpoint: NETWORK.rpc });
  const receipt = await client.waitForTransactionReceipt({ hash: hash as never, status: "FINALIZED", retries: 360, interval: 5000, fullTransaction: true } as never) as unknown as Record<string, unknown>;
  const direct = receipt.txExecutionResultName;
  const consensus = receipt.consensus_data as { leader_receipt?: { execution_result?: string }[] } | undefined;
  const leader = consensus?.leader_receipt?.find(x => x.execution_result)?.execution_result;
  if (direct === ExecutionResult.FINISHED_WITH_ERROR || leader === "ERROR") throw new Error("Transaction finalized with a contract error.");
  if (direct !== ExecutionResult.FINISHED_WITH_RETURN && leader !== "SUCCESS") throw new Error("Finalized receipt did not prove successful execution.");
  return receipt;
}
