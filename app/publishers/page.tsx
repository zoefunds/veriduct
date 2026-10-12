import { DatabaseZap, FileKey2 } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ADDRESSES, SERVICE_GOVERNANCE } from "@/lib/config";
import { ChainRecords } from "@/components/ChainRecords";

export default function Publishers() {
  return <div className="page workspace">
    <WorkspaceHeader kicker="PROVENANCE PLANE" title="Authority source registry" copy="Bind evidence to a protocol-curated authoritative HTTPS scope. Anyone may anchor exact bytes; validators retrieve the authority source independently."/>
    <div className="scopeNotice">
      <div><small>INDEPENDENT AUTHORITIES</small><b>USGS and EMSC independently catalog the same event</b></div>
      <p>The preset evidence is fetched from earthquake.usgs.gov and seismicportal.eu. Distinct authoritative hosts, source classes, exact-byte SHA-256 commitments, and semantic event matching replace same-host publisher fixtures.</p>
      <a href="https://www.seismicportal.eu/eventid/" target="_blank">Inspect EMSC cross-catalog mapping</a>
    </div>
    <div className="split">
      <section className="panel">
        <div className="panelHead"><div><small>CURATED AUTHORITY</small><h2>Register source scope</h2></div><DatabaseZap/></div>
        <TransactionForm address={ADDRESSES.publisherLedger} method="register_authority_source" submitLabel="Register authority" requiredAccount={SERVICE_GOVERNANCE} presets={[
          {label:"USGS authority",values:{source_key:"usgs-origin",name:"United States Geological Survey Earthquake Hazards Program",origin_host:"earthquake.usgs.gov",path_prefix:"/product/origin/",source_class:"GOVERNMENT",authority_uri:"https://www.usgs.gov/programs/earthquake-hazards"}},
          {label:"EMSC authority",values:{source_key:"emsc-catalog",name:"Euro-Mediterranean Seismological Centre",origin_host:"www.seismicportal.eu",path_prefix:"/fdsnws/event/1/query",source_class:"INTERGOVERNMENTAL",authority_uri:"https://www.emsc-csem.org/"}},
        ]} fields={[{name:"source_key",label:"Source key"},{name:"name",label:"Authority name"},{name:"origin_host",label:"Verified HTTPS host"},{name:"path_prefix",label:"Allowed path prefix"},{name:"source_class",label:"Authority class"},{name:"authority_uri",label:"Provenance URI"}]}/>
      </section>
      <section className="panel">
        <div className="panelHead"><div><small>IMMUTABLE OBSERVATION</small><h2>Anchor snapshot</h2></div><FileKey2/></div>
        <TransactionForm address={ADDRESSES.publisherLedger} method="anchor_snapshot" submitLabel="Anchor authority evidence" presets={[{label:"USGS M8.8 record",evidence:"usgs"},{label:"EMSC M8.8 record",evidence:"emsc"}]} fields={[{name:"snapshot_key",label:"Snapshot key"},{name:"source_key",label:"Authority source key"},{name:"url",label:"Exact authority HTTPS URL"},{name:"content_digest",label:"SHA-256 content digest"},{name:"observed_at",label:"Event unix time",kind:"number"},{name:"valid_for_seconds",label:"Claim validity seconds",kind:"number",initial:"2592000"}]}/>
      </section>
    </div>
    <ChainRecords address={ADDRESSES.publisherLedger} listMethod="list_source_keys" getMethod="get_source_json" title="Verified authority sources"/>
    <ChainRecords address={ADDRESSES.publisherLedger} listMethod="list_snapshot_keys" getMethod="get_snapshot_json" title="Anchored authority evidence"/>
  </div>;
}
