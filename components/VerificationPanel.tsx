"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, XCircle } from "lucide-react";
import manifest from "@/deployment-manifest.public.json";
import { ADDRESSES, explorerTx } from "@/lib/config";
import { readContract } from "@/lib/genlayer";

type Check = { name: string; ok: boolean; detail: string; transaction?: string };
const flow = manifest.verifiedProductionFlow;
const verified = manifest.verifiedCase;

async function sha256(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

export function VerificationPanel() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState("");

  async function verify() {
    setError(""); setChecks([]);
    try {
      const provider = JSON.parse(await readContract<string>(ADDRESSES.publisherLedger, "get_snapshot_json", ["provider-production-1791733886"]));
      const monitor = JSON.parse(await readContract<string>(ADDRESSES.publisherLedger, "get_snapshot_json", ["monitor-production-1791733886"]));
      const covenantKey = await readContract<string>(ADDRESSES.covenantBook, "get_active_covenant_key", [manifest.activeProductionPolicy.serviceKey]);
      const covenant = JSON.parse(await readContract<string>(ADDRESSES.covenantBook, "get_covenant_json", [covenantKey]));
      const caseRecord = JSON.parse(await readContract<string>(ADDRESSES.adjudicator, "get_case_json", [verified.caseKey]));
      const verdict = JSON.parse(caseRecord.verdict_json);
      const mandate = JSON.parse(await readContract<string>(ADDRESSES.mandateRouter, "get_mandate_json", [verified.mandateKey]));
      const applied = await readContract<string>(ADDRESSES.serviceControl, "get_applied_mandate_digest", [verified.mandateKey]);
      const service = JSON.parse(await readContract<string>(ADDRESSES.serviceControl, "get_status_json"));
      const [providerDigest, monitorDigest] = await Promise.all([
        fetch(provider.url, { cache: "no-store" }).then(sha256),
        fetch(monitor.url, { cache: "no-store" }).then(sha256),
      ]);
      setChecks([
        {name:"Provider fixture bytes",ok:providerDigest===provider.content_digest,detail:`Fetched SHA-256 ${providerDigest}`,transaction:flow.providerSnapshot},
        {name:"Corroborator fixture bytes",ok:monitorDigest===monitor.content_digest,detail:`Fetched SHA-256 ${monitorDigest}`,transaction:flow.monitorSnapshot},
        {name:"Active immutable covenant",ok:covenantKey===manifest.activeProductionPolicy.covenantKey&&covenant.covenant_digest===manifest.activeProductionPolicy.covenantDigest,detail:`${covenantKey} · ${covenant.covenant_digest}`,transaction:manifest.productionBootstrapTransactions.covenantActivation},
        {name:"Finalized semantic verdict",ok:caseRecord.status==="MANDATE_PENDING_FINALITY"&&verdict.decision===verified.decision&&caseRecord.verdict_digest===verified.verdictDigest,detail:`${verdict.decision} · ${caseRecord.verdict_digest}`,transaction:flow.adjudication},
        {name:"Bounded mandate",ok:mandate.status===verified.mandateStatus&&mandate.action_digest===verified.actionDigest&&mandate.dispatch_count===verified.dispatchCount,detail:`${mandate.status} · dispatch count ${mandate.dispatch_count}`,transaction:flow.mandateReconciliation},
        {name:"Authoritative target receipt",ok:applied===verified.actionDigest&&service.applied_mandate_count>=1,detail:`ServiceControl stored ${applied}`,transaction:flow.mandateExecution},
      ]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  useEffect(() => { void verify(); }, []);
  return <section className="panel verificationPanel">
    <div className="panelHead"><div><small>LIVE FINALIZED READBACK</small><h2>Publisher → covenant → verdict → mandate → adapter</h2></div><button className="button ghost" onClick={() => void verify()}>Run again</button></div>
    {!checks.length && !error && <div className="empty"><LoaderCircle className="spin"/><p>Reading latest-final state from Studionet and hashing the frozen HTTP bodies.</p></div>}
    {error && <p className="formError">{error}</p>}
    {checks.map(check => <article className={check.ok ? "verificationCheck ok" : "verificationCheck fail"} key={check.name}>
      {check.ok ? <CheckCircle2/> : <XCircle/>}<div><b>{check.name}</b><code>{check.detail}</code></div>{check.transaction&&<a href={explorerTx(check.transaction)} target="_blank" aria-label={`Open ${check.name} transaction`}><ExternalLink size={16}/></a>}
    </article>)}
    <p className="verificationFoot">Passing checks prove exact bytes, finalized GenVM records, and target receipt for this demonstration deployment. They do not prove that the synthetic measurements are externally accurate.</p>
  </section>;
}
