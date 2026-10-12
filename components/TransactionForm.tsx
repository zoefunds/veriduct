"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Wallet } from "lucide-react";
import { connectWallet, readContract, waitFinalized, writeContract } from "@/lib/genlayer";
import { ADDRESSES, explorerTx } from "@/lib/config";

export type Field = { name: string; label: string; placeholder?: string; kind?: "text" | "number" | "textarea"; initial?: string };
type Preset = { label: string; values?: Record<string,string>; evidence?: "usgs" | "emsc"; workflow?: "covenant" | "activation" | "case" | "adjudicate" | "mandate" | "reconcile" };
export function TransactionForm({ address, method, fields, submitLabel, presets = [], requiredAccount }: { address: string; method: string; fields: Field[]; submitLabel: string; presets?: Preset[]; requiredAccount?: string }) {
  const [values, setValues] = useState<Record<string,string>>(() => Object.fromEntries(fields.map(f => [f.name, f.initial || ""])));
  const [state, setState] = useState<{ busy?: boolean; hash?: string; error?: string }>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState({ busy: true });
    try {
      const account = await connectWallet();
      if (requiredAccount && account.toLowerCase() !== requiredAccount.toLowerCase()) {
        throw new Error(`This operation must be signed by service governance ${requiredAccount}. Switch wallets before submitting.`);
      }
      const args = fields.map(f => f.kind === "number" ? Number(values[f.name]) : values[f.name]);
      const hash = await writeContract(account, address, method, args);
      if (method === "anchor_snapshot") {
        const existing = JSON.parse(localStorage.getItem("veriduct-demo-snapshots") || "[]") as string[];
        localStorage.setItem("veriduct-demo-snapshots", JSON.stringify([...new Set([...existing, values.snapshot_key])].slice(-2)));
      }
      if (method === "open_case") localStorage.setItem("veriduct-demo-case", JSON.stringify(values));
      setState({ busy: true, hash });
      await waitFinalized(hash);
      if (method === "publish_covenant") localStorage.setItem("veriduct-demo-covenant", values.covenant_key);
      setState({ hash });
    } catch (error) { setState({ error: error instanceof Error ? error.message : String(error) }); }
  }
  async function applyPreset(preset: Preset) {
    try {
      let next = { ...values, ...(preset.values || {}) };
      if (preset.workflow === "covenant") {
        next = { ...next, covenant_key: `veriduct-seismic-safety-${Math.floor(Date.now()/1000)}` };
      }
      if (preset.workflow === "activation") {
        const covenantKey = localStorage.getItem("veriduct-demo-covenant");
        if (!covenantKey) throw new Error("Publish a test covenant first; its finalized key will be inserted here automatically.");
        next = { ...next, covenant_key: covenantKey };
      }
      if (preset.evidence) {
        const response = await fetch(`/api/evidence/authority?source=${preset.evidence}`, { cache: "no-store" });
        if (!response.ok) throw new Error("The selected authority source is temporarily unavailable.");
        const evidence = await response.json() as { source_key:string; url:string; content_digest:string; observed_at:number; valid_for_seconds:number };
        next = { ...next, snapshot_key: `${preset.evidence}-kamchatka-${Math.floor(Date.now()/1000)}`, source_key:evidence.source_key, url:evidence.url, content_digest:evidence.content_digest, observed_at:String(evidence.observed_at), valid_for_seconds:String(evidence.valid_for_seconds) };
      }
      if (preset.workflow === "case") {
        const snapshots = JSON.parse(localStorage.getItem("veriduct-demo-snapshots") || "[]") as string[];
        if (snapshots.length < 2) throw new Error("Anchor both demonstration observations first; their live keys will be inserted here automatically.");
        const covenantKey = await readContract<string>(ADDRESSES.covenantBook, "get_active_covenant_key", ["veriduct-seismic-control"]);
        if (!covenantKey) throw new Error("The seismic safety covenant is not active yet.");
        next = { ...next, case_key:`kamchatka-quake-${Math.floor(Date.now()/1000)}`, covenant_key:covenantKey, action_id:"ENTER_READ_ONLY", intensity:"60", payload_json:JSON.stringify({reason:"Independent USGS and EMSC catalogs confirm the covenant seismic threshold.",until:Math.floor(Date.now()/1000)+1200}), claim:"USGS and EMSC independently catalog the same 29 July 2025 Kamchatka earthquake at magnitude 8.8, with origin times approximately one second apart and nearby epicenters. The event exceeds the covenant magnitude-8.0 safety threshold and supports a bounded 20-minute read-only action on the demonstration ServiceControl adapter.", snapshot_keys_json:JSON.stringify(snapshots) };
      }
      if (preset.workflow === "adjudicate") {
        const caseValues = JSON.parse(localStorage.getItem("veriduct-demo-case") || "{}") as Record<string,string>;
        if (!caseValues.case_key) throw new Error("Open the production case first; its live key will be inserted here automatically.");
        next = { ...next, case_key: caseValues.case_key };
      }
      if (preset.workflow === "mandate") {
        const caseValues = JSON.parse(localStorage.getItem("veriduct-demo-case") || "{}") as Record<string,string>;
        if (!caseValues.case_key) throw new Error("Open the production case first; its exact mandate envelope will be inserted here automatically.");
        next = { ...next, mandate_key:`MANDATE-${caseValues.case_key}`, target:ADDRESSES.serviceControl, action_id:caseValues.action_id, intensity:caseValues.intensity, payload_json:caseValues.payload_json };
      }
      if (preset.workflow === "reconcile") {
        const caseValues = JSON.parse(localStorage.getItem("veriduct-demo-case") || "{}") as Record<string,string>;
        if (!caseValues.case_key) throw new Error("Open a case first; its exact mandate key will be inserted here automatically.");
        next = { ...next, mandate_key:`MANDATE-${caseValues.case_key}` };
      }
      setValues(next); setState({});
    } catch (error) { setState({ error: error instanceof Error ? error.message : String(error) }); }
  }
  return <form className="txForm" onSubmit={submit}>{presets.length>0&&<div className="presetBar"><span>Demo autofill</span>{presets.map(preset=><button key={preset.label} type="button" onClick={()=>void applyPreset(preset)}>{preset.label}</button>)}</div>}{fields.map(field => <label key={field.name}><span>{field.label}</span>{field.kind === "textarea" ? <textarea required value={values[field.name]} placeholder={field.placeholder} onChange={e => setValues(v => ({...v,[field.name]:e.target.value}))}/> : <input required type={field.kind === "number" ? "number" : "text"} value={values[field.name]} placeholder={field.placeholder} onChange={e => setValues(v => ({...v,[field.name]:e.target.value}))}/>}</label>)}<button className="button primary" disabled={state.busy || !address}>{state.busy ? <LoaderCircle className="spin" size={17}/> : <Wallet size={17}/>} {state.busy ? "Awaiting finality" : submitLabel}<ArrowRight size={16}/></button>{state.hash && <a className="txLink" href={explorerTx(state.hash)} target="_blank">Transaction {state.hash.slice(0,10)}…</a>}{state.error && <p className="formError">{state.error}</p>}</form>;
}
