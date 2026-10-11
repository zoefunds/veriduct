import { BookOpenText } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ChainRecords } from "@/components/ChainRecords";
import { ADDRESSES, SERVICE_GOVERNANCE } from "@/lib/config";

export default function Covenants() {
  const productionActions = JSON.stringify([
    {action_id:"ENTER_READ_ONLY",target:ADDRESSES.serviceControl,max_intensity:80,payload_schema_digest:"22b8255d4abed99e0afc2c27881e3a8999f02e192440aefda5f70d736d26b950"},
    {action_id:"RAISE_REVIEW_THRESHOLD",target:ADDRESSES.serviceControl,max_intensity:70,payload_schema_digest:"63a29967edc6ce09e0e136a79b2af5842e8398699aefaac1fb132931bfa4a22d"},
  ]);
  return <div className="page workspace">
    <WorkspaceHeader kicker="POLICY PLANE" title="Covenant composer" copy="Define the evidence quorum, semantic breach test, and every remedy envelope before a dispute exists."/>
    <div className="split">
      <section className="panel">
        <div className="panelHead"><div><small>VERSIONED POLICY</small><h2>Publish immutable covenant</h2></div><BookOpenText/></div>
        <TransactionForm address={ADDRESSES.covenantBook} method="publish_covenant" submitLabel="Publish covenant" requiredAccount={SERVICE_GOVERNANCE} presets={[{
          label:"Governed availability covenant",
          workflow:"covenant",
          values:{
            covenant_key:"",
            service_key:"veriduct-production-payments-api",
            service_name:"VERIDUCT Production Payments API",
            remedy_policy:"When two approved independent publishers each report availability below 95 percent for the same 30-minute observation window, validators may authorize read-only mode at intensity no greater than 80 for no longer than the mandate expiry. The remedy protects balances and payment integrity while operators restore multi-region service.",
            evidence_policy:"Validators must fetch every frozen HTTPS evidence URL, hash the exact response bytes with SHA-256, match each digest to its anchored snapshot, confirm the contract-verified distinct registered publisher owners, and compare the reported availability, latency, errors, regions, observation times, and maintenance status against this covenant. Separate origin-bound paths on the canonical production host are permitted.",
            publishers_json:'["provider-operations","independent-observer"]',
            actions_json:productionActions,
            minimum_publishers:"2",
            observation_max_age_minutes:"60",
            mandate_ttl_minutes:"30",
            activation_delay_minutes:"1",
          },
        }]} fields={[
          {name:"covenant_key",label:"Covenant key",placeholder:"api-availability-v1"},
          {name:"service_key",label:"Service key",placeholder:"payment-api"},
          {name:"service_name",label:"Service name"},
          {name:"remedy_policy",label:"Breach and proportionality policy",kind:"textarea"},
          {name:"evidence_policy",label:"Evidence-quality policy",kind:"textarea"},
          {name:"publishers_json",label:"Approved publisher keys (JSON)",kind:"textarea",placeholder:'["status-primary","monitor-independent"]'},
          {name:"actions_json",label:"Allowed remedies (JSON)",kind:"textarea",placeholder:'[{"action_id":"ENTER_READ_ONLY","target":"0x…","max_intensity":100,"payload_schema_digest":"…"}]'},
          {name:"minimum_publishers",label:"Minimum distinct publishers",kind:"number",initial:"2"},
          {name:"observation_max_age_minutes",label:"Maximum observation age",kind:"number",initial:"60"},
          {name:"mandate_ttl_minutes",label:"Mandate TTL",kind:"number",initial:"30"},
          {name:"activation_delay_minutes",label:"Activation delay",kind:"number",initial:"60"},
        ]}/>
      </section>
      <section className="panel compactAction">
        <div className="panelHead"><div><small>DELAYED GOVERNANCE</small><h2>Activate version</h2></div></div>
        <TransactionForm address={ADDRESSES.covenantBook} method="activate_covenant" submitLabel="Activate covenant" requiredAccount={SERVICE_GOVERNANCE} presets={[{label:"Latest published covenant",workflow:"activation"}]} fields={[{name:"covenant_key",label:"Eligible covenant key"}]}/>
      </section>
    </div>
    <ChainRecords address={ADDRESSES.covenantBook} listMethod="list_covenant_keys" getMethod="get_covenant_json" title="Covenant versions"/>
  </div>;
}
