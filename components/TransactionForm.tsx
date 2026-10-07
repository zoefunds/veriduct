"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Wallet } from "lucide-react";
import { connectWallet, waitFinalized, writeContract } from "@/lib/genlayer";
import { ADDRESSES, explorerTx } from "@/lib/config";

export type Field = { name: string; label: string; placeholder?: string; kind?: "text" | "number" | "textarea"; initial?: string };
type Preset = { label: string; values?: Record<string,string>; evidence?: "provider" | "monitor"; workflow?: "case" | "mandate" };
export function TransactionForm({ address, method, fields, submitLabel, presets = [] }: { address: string; method: string; fields: Field[]; submitLabel: string; presets?: Preset[] }) {
  const [values, setValues] = useState<Record<string,string>>(() => Object.fromEntries(fields.map(f => [f.name, f.initial || ""])));
  const [state, setState] = useState<{ busy?: boolean; hash?: string; error?: string }>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState({ busy: true });
    try {
      const account = await connectWallet();
      const args = fields.map(f => f.kind === "number" ? Number(values[f.name]) : values[f.name]);
      const hash = await writeContract(account, address, method, args);
      if (method === "anchor_snapshot") {
        const existing = JSON.parse(localStorage.getItem("veriduct-demo-snapshots") || "[]") as string[];
        localStorage.setItem("veriduct-demo-snapshots", JSON.stringify([...new Set([...existing, values.snapshot_key])].slice(-2)));
      }
      if (method === "open_case") localStorage.setItem("veriduct-demo-case", JSON.stringify(values));
      setState({ busy: true, hash });
      await waitFinalized(hash);
      setState({ hash });
    } catch (error) { setState({ error: error instanceof Error ? error.message : String(error) }); }
  }
  async function applyPreset(preset: Preset) {
    try {
      let next = { ...values, ...(preset.values || {}) };
      if (preset.evidence) {
        const observedAt = Math.floor(Date.now()/1000);
        const url = `https://veri-duct.vercel.app/api/evidence/${preset.evidence}?at=${observedAt}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("The production evidence endpoint is not available yet.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        const digestBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        const digest = Array.from(digestBytes).map(value => value.toString(16).padStart(2,"0")).join("");
        const publisher = preset.evidence === "provider" ? "provider-operations" : "independent-observer";
        next = { ...next, snapshot_key: `${preset.evidence}-${observedAt}`, publisher_key: publisher, url, content_digest: digest, observed_at: String(observedAt), valid_for_seconds: "3600" };
      }
      if (preset.workflow === "case") {
        const snapshots = JSON.parse(localStorage.getItem("veriduct-demo-snapshots") || "[]") as string[];
        if (snapshots.length < 2) throw new Error("Anchor both demo observations first; their live keys will be inserted here automatically.");
        next = { ...next, case_key:"demo-outage-case-1", covenant_key:"demo-payments-availability-v1", action_id:"ENTER_READ_ONLY", intensity:"60", payload_json:JSON.stringify({reason:"Sustained multi-region availability breach",until:Math.floor(Date.now()/1000)+3600}), claim:"Two authenticated publishers report sustained availability near 91 percent and elevated errors across multiple regions, satisfying the active covenant threshold. A one-hour read-only period is requested to prevent unsafe writes while service integrity is restored.", snapshot_keys_json:JSON.stringify(snapshots) };
      }
      if (preset.workflow === "mandate") {
        const caseValues = JSON.parse(localStorage.getItem("veriduct-demo-case") || "{}") as Record<string,string>;
        if (!caseValues.case_key) throw new Error("Open the demo case first; its exact mandate envelope will be inserted here automatically.");
        next = { ...next, mandate_key:`MANDATE-${caseValues.case_key}`, target:ADDRESSES.serviceControl, action_id:caseValues.action_id, intensity:caseValues.intensity, payload_json:caseValues.payload_json };
      }
      setValues(next); setState({});
    } catch (error) { setState({ error: error instanceof Error ? error.message : String(error) }); }
  }
  return <form className="txForm" onSubmit={submit}>{presets.length>0&&<div className="presetBar"><span>Demo autofill</span>{presets.map(preset=><button key={preset.label} type="button" onClick={()=>void applyPreset(preset)}>{preset.label}</button>)}</div>}{fields.map(field => <label key={field.name}><span>{field.label}</span>{field.kind === "textarea" ? <textarea required value={values[field.name]} placeholder={field.placeholder} onChange={e => setValues(v => ({...v,[field.name]:e.target.value}))}/> : <input required type={field.kind === "number" ? "number" : "text"} value={values[field.name]} placeholder={field.placeholder} onChange={e => setValues(v => ({...v,[field.name]:e.target.value}))}/>}</label>)}<button className="button primary" disabled={state.busy || !address}>{state.busy ? <LoaderCircle className="spin" size={17}/> : <Wallet size={17}/>} {state.busy ? "Awaiting finality" : submitLabel}<ArrowRight size={16}/></button>{state.hash && <a className="txLink" href={explorerTx(state.hash)} target="_blank">Transaction {state.hash.slice(0,10)}…</a>}{state.error && <p className="formError">{state.error}</p>}</form>;
}
