import { BookOpenText } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ChainRecords } from "@/components/ChainRecords";
import { ADDRESSES, SERVICE_GOVERNANCE } from "@/lib/config";

export default function Covenants() {
  const productionActions = JSON.stringify([
    {action_id:"ENTER_READ_ONLY",target:ADDRESSES.serviceControl,max_intensity:80,payload_schema_digest:"22b8255d4abed99e0afc2c27881e3a8999f02e192440aefda5f70d736d26b950"},
    {action_id:"RAISE_REVIEW_THRESHOLD",target:ADDRESSES.serviceControl,max_intensity:70,payload_schema_digest:"d228bbd387df5ce0b935c89e00da2f1aa2fb2149dab0202fe65999ce56d4a098"},
  ]);
  return <div className="page workspace">
    <WorkspaceHeader kicker="POLICY PLANE" title="Covenant composer" copy="Define the evidence quorum, semantic breach test, and every remedy envelope before a dispute exists."/>
    <div className="split">
      <section className="panel">
        <div className="panelHead"><div><small>VERSIONED POLICY</small><h2>Publish immutable covenant</h2></div><BookOpenText/></div>
        <TransactionForm address={ADDRESSES.covenantBook} method="publish_covenant" submitLabel="Publish covenant" requiredAccount={SERVICE_GOVERNANCE} presets={[{
          label:"Independent seismic covenant",
          workflow:"covenant",
          values:{
            covenant_key:"",
            service_key:"veriduct-seismic-control",
            service_name:"VERIDUCT Seismic Safety Control",
            remedy_policy:"When the independently operated USGS and EMSC earthquake catalogs both identify the same seismic event at magnitude 8.0 or greater, with materially compatible origin time and location, validators may authorize ServiceControl read-only mode at intensity no greater than 80 for no more than two hours. This bounded consequence applies only to the deployed onchain demonstration adapter.",
            evidence_policy:"Validators must independently fetch the exact USGS and EMSC authority URLs, hash the response bytes with SHA-256, match every anchored commitment, confirm distinct registered hosts and required authority classes, and compare event identity, magnitude, origin time, latitude, longitude, and depth. Missing, altered, unrelated, or materially conflicting authority records must fail closed and cannot produce BREACH_PROVEN.",
            sources_json:'["usgs-origin","emsc-catalog"]',
            required_source_classes_json:'["GOVERNMENT","INTERGOVERNMENTAL"]',
            claim_mode:"PERMISSIONLESS",
            claimants_json:"[]",
            actions_json:productionActions,
            minimum_sources:"2",
            observation_max_age_minutes:"5256000",
            mandate_ttl_minutes:"30",
            activation_delay_minutes:"1",
          },
        }]} fields={[
          {name:"covenant_key",label:"Covenant key",placeholder:"api-availability-v1"},
          {name:"service_key",label:"Service key",placeholder:"payment-api"},
          {name:"service_name",label:"Service name"},
          {name:"remedy_policy",label:"Breach and proportionality policy",kind:"textarea"},
          {name:"evidence_policy",label:"Evidence-quality policy",kind:"textarea"},
          {name:"sources_json",label:"Verified authority source keys (JSON)",kind:"textarea"},
          {name:"required_source_classes_json",label:"Required authority classes (JSON)",kind:"textarea"},
          {name:"claim_mode",label:"Claim initiation mode"},
          {name:"claimants_json",label:"Authorized counterparties for allowlist mode (JSON)",kind:"textarea"},
          {name:"actions_json",label:"Allowed remedies (JSON)",kind:"textarea",placeholder:'[{"action_id":"ENTER_READ_ONLY","target":"0x…","max_intensity":100,"payload_schema_digest":"…"}]'},
          {name:"minimum_sources",label:"Minimum independent sources",kind:"number",initial:"2"},
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
