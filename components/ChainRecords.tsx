"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { readContract } from "@/lib/genlayer";

export function ChainRecords({ address, listMethod, getMethod, title, pollMs = 12000 }: { address: string; listMethod: string; getMethod: string; title: string; pollMs?: number }) {
  const [keys, setKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!address) return;
    try {
      const next = await readContract<string[]>(address, listMethod);
      setKeys(next);
      const key = selected || next.at(-1) || "";
      if (key) {
        const raw = await readContract<string>(address, getMethod, [key]);
        setSelected(key); setRecord(raw ? JSON.parse(raw) : null);
      }
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }, [address, getMethod, listMethod, selected]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), pollMs); return () => window.clearInterval(timer); }, [load, pollMs]);
  async function choose(key: string) { setSelected(key); try { const raw = await readContract<string>(address, getMethod, [key]); setRecord(raw ? JSON.parse(raw) : null); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }
  return <section className="panel chainRecords"><div className="panelHead"><div><small>FINALIZED CHAIN STATE</small><h2>{title}</h2></div><button className="iconButton" onClick={load} aria-label="Refresh finalized records"><RefreshCw size={17}/></button></div>{keys.length ? <div className="recordLayout"><div className="keyList">{[...keys].reverse().map(key => <button key={key} className={selected === key ? "selected" : ""} onClick={() => void choose(key)}>{key}</button>)}</div><pre>{record ? JSON.stringify(record, null, 2) : "Select a record"}</pre></div> : <div className="empty"><p>{error || (address ? "No finalized records yet. Polling Studionet directly." : "Deployments are not configured yet.")}</p></div>}</section>;
}
