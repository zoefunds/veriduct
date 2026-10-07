import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DecodedDeployData, GenLayerClient, TransactionHash } from "genlayer-js/types";

const CHAIN_ID = 61999;
const RPC = "https://studio.genlayer.com/api";
const code = (name: string) => new Uint8Array(readFileSync(path.resolve(process.cwd(), "contracts", name)));

async function final(client: GenLayerClient<any>, hash: TransactionHash) {
  const receipt: any = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 360, interval: 5000, fullTransaction: true } as any);
  const leader = receipt?.consensus_data?.leader_receipt?.find((x: any) => x.execution_result)?.execution_result;
  if (receipt?.txExecutionResultName !== "FINISHED_WITH_RETURN" && leader !== "SUCCESS") throw new Error(`Finalized transaction failed: ${hash}`);
  return receipt;
}
async function deploy(client: GenLayerClient<any>, file: string, args: unknown[] = []) {
  const txId = await client.deployContract({ code: code(file), args: args as any[] });
  const receipt: any = await final(client, txId as TransactionHash);
  const address = receipt?.data?.contract_address ?? (receipt?.txDataDecoded as DecodedDeployData | undefined)?.contractAddress;
  if (!address) throw new Error(`No address decoded for ${file}`);
  return { address: String(address), txId: String(txId) };
}
async function write(client: GenLayerClient<any>, address: string, functionName: string, args: unknown[]) {
  const hash = await client.writeContract({ address: address as `0x${string}`, functionName, args, value: 0n } as any);
  await final(client, hash as TransactionHash); return String(hash);
}
export default async function main(client: GenLayerClient<any>) {
  if (Number(client.chain?.id) !== CHAIN_ID) throw new Error(`VERIDUCT deploys only to stable Studionet ${CHAIN_ID}`);
  await client.initializeConsensusSmartContract();
  const publisherLedger = await deploy(client, "publisher_ledger.py");
  const covenantBook = await deploy(client, "covenant_book.py");
  const mandateRouter = await deploy(client, "mandate_router.py");
  const adjudicator = await deploy(client, "adjudicator.py", [publisherLedger.address, covenantBook.address, mandateRouter.address]);
  const bindAdjudicatorTx = await write(client, mandateRouter.address, "bind_adjudicator", [adjudicator.address]);
  const serviceControl = await deploy(client, "service_control.py", [mandateRouter.address]);
  const contracts = { publisherLedger: publisherLedger.address, covenantBook: covenantBook.address, adjudicator: adjudicator.address, mandateRouter: mandateRouter.address, serviceControl: serviceControl.address };
  const env = [`NEXT_PUBLIC_GENLAYER_CHAIN_ID=${CHAIN_ID}`,`NEXT_PUBLIC_GENLAYER_RPC_URL=${RPC}`,"NEXT_PUBLIC_GENLAYER_EXPLORER=https://explorer-studio.genlayer.com",...Object.entries(contracts).map(([k,v])=>`NEXT_PUBLIC_${k.replace(/[A-Z]/g,m=>`_${m}`).toUpperCase()}_ADDRESS=${v}`),""];
  writeFileSync(path.resolve(".env.generated"), env.join("\n"));
  writeFileSync(path.resolve("deployment-manifest.generated.json"), JSON.stringify({ project:"VERIDUCT",network:"studionet",chainId:CHAIN_ID,rpc:RPC,contracts,deploymentTransactions:{publisherLedger:publisherLedger.txId,covenantBook:covenantBook.txId,mandateRouter:mandateRouter.txId,adjudicator:adjudicator.txId,serviceControl:serviceControl.txId},bindAdjudicatorTx,generatedAt:new Date().toISOString() },null,2)+"\n");
}
