import { DatabaseZap, FileKey2 } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ADDRESSES } from "@/lib/config";
import { ChainRecords } from "@/components/ChainRecords";

export default function Publishers() {
  return <div className="page workspace">
    <WorkspaceHeader kicker="PROVENANCE PLANE" title="Publisher registry" copy="Bind an observation feed to an onchain identity and origin. Each snapshot freezes the exact bytes validators must retrieve."/>
    <div className="scopeNotice">
      <div><small>DEMO DATA</small><b>Identity independence is not measurement independence</b></div>
      <p>These presets generate deterministic fixtures on one Vercel application. Their different wallets prove separate onchain publisher ownership only. They do not prove separate probe infrastructure, independent operators, or real-world measurement accuracy.</p>
      <a href="/api/provenance" target="_blank">Inspect provenance disclosure</a>
    </div>
    <div className="split">
      <section className="panel">
        <div className="panelHead"><div><small>NEW IDENTITY</small><h2>Register publisher</h2></div><DatabaseZap/></div>
        <TransactionForm address={ADDRESSES.publisherLedger} method="register_publisher" submitLabel="Register identity" presets={[
          {label:"Provider demo identity",values:{publisher_key:"provider-operations",name:"VERIDUCT Provider Demo Publisher — Synthetic Reliability Fixture",origin_host:"veri-duct.vercel.app"}},
          {label:"Corroborator demo identity",values:{publisher_key:"independent-observer",name:"VERIDUCT Corroborator Demo Publisher — Synthetic Probe Fixture",origin_host:"veri-duct.vercel.app"}},
        ]} fields={[{name:"publisher_key",label:"Publisher key",placeholder:"status-api-primary"},{name:"name",label:"Display name",placeholder:"Primary status telemetry"},{name:"origin_host",label:"Canonical origin",placeholder:"status.example.org"}]}/>
      </section>
      <section className="panel">
        <div className="panelHead"><div><small>IMMUTABLE OBSERVATION</small><h2>Anchor snapshot</h2></div><FileKey2/></div>
        <TransactionForm address={ADDRESSES.publisherLedger} method="anchor_snapshot" submitLabel="Anchor observation" presets={[{label:"Provider demo fixture",evidence:"provider"},{label:"Corroborator demo fixture",evidence:"monitor"}]} fields={[{name:"snapshot_key",label:"Snapshot key",placeholder:"latency-2026-10-06T1200"},{name:"publisher_key",label:"Publisher key"},{name:"url",label:"Exact HTTPS URL"},{name:"content_digest",label:"SHA-256 content digest"},{name:"observed_at",label:"Observed unix time",kind:"number"},{name:"valid_for_seconds",label:"Validity seconds",kind:"number",initial:"3600"}]}/>
      </section>
    </div>
    <ChainRecords address={ADDRESSES.publisherLedger} listMethod="list_snapshot_keys" getMethod="get_snapshot_json" title="Anchored observations"/>
  </div>;
}
