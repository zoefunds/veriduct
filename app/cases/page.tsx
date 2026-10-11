import { Gavel, ScanSearch } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ChainRecords } from "@/components/ChainRecords";
import { ADDRESSES, SERVICE_GOVERNANCE } from "@/lib/config";

export default function Cases() {
  return <div className="page workspace">
    <WorkspaceHeader kicker="CONSENSUS PLANE" title="Decision laboratory" copy="Assemble anchored observations into a frozen case. Validators independently retrieve identical bytes and test the same bounded claim."/>
    <div className="split caseSplit">
      <section className="panel">
        <div className="panelHead"><div><small>FREEZE ENVELOPE</small><h2>Open covenant case</h2></div><ScanSearch/></div>
        <TransactionForm address={ADDRESSES.adjudicator} method="open_case" submitLabel="Open case" requiredAccount={SERVICE_GOVERNANCE} presets={[{label:"Verified outage case",workflow:"case"}]} fields={[
          {name:"case_key",label:"Case key"},
          {name:"covenant_key",label:"Active covenant key"},
          {name:"action_id",label:"Requested remedy"},
          {name:"intensity",label:"Intensity",kind:"number"},
          {name:"payload_json",label:"Canonical action payload",kind:"textarea",placeholder:'{"reason":"SLA breach","until":"1791300000"}'},
          {name:"claim",label:"Claim",kind:"textarea"},
          {name:"snapshot_keys_json",label:"Anchored snapshots (JSON)",kind:"textarea",placeholder:'["snapshot-a","snapshot-b"]'},
        ]}/>
      </section>
      <div>
        <section className="panel verdictCard">
          <Gavel size={32}/><small>VERDICT STATES</small>
          {["BREACH_PROVEN","NO_BREACH","INSUFFICIENT_CORROBORATION","CONFLICTING_OBSERVATIONS","REMEDY_DISPROPORTIONATE"].map(x=><div key={x}><span className="dot"/><code>{x}</code></div>)}
          <p>Only a finalized <code>BREACH_PROVEN</code> parent can trigger mandate issuance.</p>
        </section>
        <section className="panel compactAction">
          <div className="panelHead"><div><small>NONDETERMINISTIC DECISION</small><h2>Adjudicate case</h2></div></div>
          <TransactionForm address={ADDRESSES.adjudicator} method="adjudicate" submitLabel="Run validator adjudication" presets={[{label:"Latest production case",workflow:"adjudicate"}]} fields={[{name:"case_key",label:"Open case key"}]}/>
        </section>
      </div>
    </div>
    <ChainRecords address={ADDRESSES.adjudicator} listMethod="list_case_keys" getMethod="get_case_json" title="Covenant cases"/>
  </div>;
}
