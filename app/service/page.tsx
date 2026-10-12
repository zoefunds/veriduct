"use client";
import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { TransactionForm } from "@/components/TransactionForm";
import { ADDRESSES } from "@/lib/config";
import { readContract } from "@/lib/genlayer";

const READ_ONLY_SCHEMA="22b8255d4abed99e0afc2c27881e3a8999f02e192440aefda5f70d736d26b950";
const REVIEW_SCHEMA="d228bbd387df5ce0b935c89e00da2f1aa2fb2149dab0202fe65999ce56d4a098";

export default function Service(){
  const [data,setData]=useState<Record<string,unknown>|null>(null); const [error,setError]=useState("");
  async function load(){try{setError("");const raw=await readContract<string>(ADDRESSES.serviceControl,"get_status_json");setData(JSON.parse(raw))}catch(e){setError(e instanceof Error?e.message:String(e))}}
  useEffect(()=>{if(!ADDRESSES.serviceControl)return;void load();const timer=window.setInterval(()=>void load(),12000);return()=>window.clearInterval(timer)},[]);
  return <div className="page workspace">
    <WorkspaceHeader kicker="CONSEQUENCE PLANE" title="Service control adapter" copy="Observe authoritative adapter state after the mandate child transaction finalizes. This demonstration target is not connected to an externally operated payments service."/>
    <div className="scopeNotice"><div><small>ENFORCEMENT SCOPE</small><b>Deployed adapter only</b></div><p>Read-only mode governs operations submitted to the onchain ServiceControl contract. It does not pause, modify, or make claims about any external production payments system.</p></div>
    <section className="panel serviceStatus"><div className="panelHead"><div><small>FINALIZED STATE</small><h2>Operational posture</h2></div><button className="iconButton" onClick={load}><RefreshCw size={18}/></button></div>{data?<div className="statusGrid"><div><small>MODE</small><strong className={data.read_only?"danger":"ok"}>{data.read_only?"READ ONLY":"OPEN"}</strong></div><div><small>REVIEW THRESHOLD</small><strong>{String(data.review_threshold)}</strong></div><div><small>OPERATIONS</small><strong>{String(data.operation_count)}</strong></div><div><small>APPLIED MANDATES</small><strong>{String(data.applied_mandate_count)}</strong></div></div>:<div className="empty"><Activity/><p>{error||"Connect a verified deployment to inspect the service adapter."}</p></div>}</section>
    <div className="split adapterForms"><section className="panel"><div className="panelHead"><div><small>ROUTE ENROLLMENT</small><h2>Register read-only action</h2></div></div><TransactionForm address={ADDRESSES.mandateRouter} method="register_adapter" submitLabel="Register adapter" fields={[{name:"action_id",label:"Action ID",initial:"ENTER_READ_ONLY"},{name:"target",label:"Service target",initial:ADDRESSES.serviceControl},{name:"payload_schema_digest",label:"Schema digest",initial:READ_ONLY_SCHEMA}]}/></section><section className="panel"><div className="panelHead"><div><small>ROUTE ENROLLMENT</small><h2>Register review action</h2></div></div><TransactionForm address={ADDRESSES.mandateRouter} method="register_adapter" submitLabel="Register adapter" fields={[{name:"action_id",label:"Action ID",initial:"RAISE_REVIEW_THRESHOLD"},{name:"target",label:"Service target",initial:ADDRESSES.serviceControl},{name:"payload_schema_digest",label:"Schema digest",initial:REVIEW_SCHEMA}]}/></section></div>
  </div>;
}
