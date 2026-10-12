from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
def source(name): return (ROOT / "contracts" / name).read_text()

def test_every_contract_pins_stable_runner():
    for file in ("publisher_ledger.py","covenant_book.py","adjudicator.py","mandate_router.py","service_control.py"):
        assert "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" in source(file)

def test_both_authority_hops_are_finality_gated():
    assert 'emit(on="finalized").issue_mandate' in source("adjudicator.py")
    assert 'emit(on="finalized").apply_mandate' in source("mandate_router.py")
    assert 'on="accepted"' not in "".join(source(x) for x in ("adjudicator.py","mandate_router.py"))

def test_source_authenticity_is_code_derived_and_exact():
    text = source("adjudicator.py")
    assert "hashlib.sha256(body).hexdigest()" in text
    assert 'actual == snapshot["content_digest"]' in text
    assert 'x["authentic"]' in text

def test_action_router_is_not_hard_coded_to_target_methods():
    text = source("mandate_router.py")
    assert ".apply_mandate(" in text
    assert "if action_id ==" not in text
    assert "register_adapter" in text

def test_distinct_authority_quorum_is_enforced_before_consensus():
    text = source("adjudicator.py")
    assert "corroborating evidence must use distinct sources and authority hosts" in text
    assert 'len(sources) < int(covenant["minimum_sources"])' in text
    assert "required authority classes are not represented" in text

def test_target_revalidates_expiry_schema_and_replay():
    text = source("service_control.py")
    assert "expired mandate cannot reach the adapter" in text
    assert "malformed or unauthorized remedy payload" in text
    assert "mandate already applied" in text
    assert "only MandateRouter may apply remedies" in text

def test_router_accepts_cli_decoded_address_values():
    text = source("mandate_router.py")
    assert 'hasattr(value, "as_hex")' in text
    assert "target_hex = _address_hex(target)" in text

def test_adjudicator_constructor_accepts_cli_decoded_address_values():
    text = source("adjudicator.py")
    assert 'hasattr(value, "as_hex")' in text
    assert "self.ledger_address = _address_hex(ledger_address)" in text
    assert "self.book_address = _address_hex(book_address)" in text
    assert "self.router_address = _address_hex(router_address)" in text

def test_public_json_boundaries_accept_cli_decoded_objects():
    adjudicator = source("adjudicator.py")
    router = source("mandate_router.py")
    assert "payload_json if isinstance(payload_json, dict) else json.loads(payload_json)" in adjudicator
    assert router.count("payload_json if isinstance(payload_json, dict) else json.loads(payload_json)") == 1
    assert 'raise gl.vm.UserError("payload must be a JSON object")' in router

def test_semantic_prompt_receives_frozen_authority_provenance():
    text = source("adjudicator.py")
    assert '"source_class": snapshot["source_class"]' in text
    assert '"authority_uri": snapshot["authority_uri"]' in text
    assert "distinct authority host" in text
    assert "Never omit or rename snapshot_states" in text
    assert 'isinstance(raw.get("states"), dict)' in text

def test_authority_urls_are_scoped_by_host_and_path():
    ledger = source("publisher_ledger.py")
    assert 'host != source["origin_host"]' in ledger
    assert 'not path.startswith(source["path_prefix"])' in ledger
    assert "snapshot URL is outside verified authority scope" in ledger

def test_governed_policy_and_permissionless_claim_autofill_are_separated():
    config = (ROOT / "lib" / "config.ts").read_text()
    form = (ROOT / "components" / "TransactionForm.tsx").read_text()
    covenants = (ROOT / "app" / "covenants" / "page.tsx").read_text()
    cases = (ROOT / "app" / "cases" / "page.tsx").read_text()
    assert "SERVICE_GOVERNANCE = manifest.deployer" in config
    assert "account.toLowerCase() !== requiredAccount.toLowerCase()" in form
    assert 'workflow:"covenant"' in covenants
    assert 'service_key:"veriduct-seismic-control"' in covenants
    assert 'requiredAccount={SERVICE_GOVERNANCE}' in covenants
    assert 'requiredAccount={SERVICE_GOVERNANCE}' not in cases
    assert 'get_active_covenant_key' in form
    assert 'veriduct-seismic-safety-${Math.floor(Date.now()/1000)}' in form
    assert 'localStorage.setItem("veriduct-demo-covenant"' in form
    assert 'case_key:`kamchatka-quake-${Math.floor(Date.now()/1000)}`' in form
    assert "Math.floor(Date.now()/1000)+1200" in form
    assert "bounded 20-minute read-only action" in form


def test_independent_provenance_and_adapter_scope_are_explicit():
    evidence = (ROOT / "lib" / "evidence.ts").read_text()
    home = (ROOT / "app" / "page.tsx").read_text()
    publishers = (ROOT / "app" / "publishers" / "page.tsx").read_text()
    service = (ROOT / "app" / "service" / "page.tsx").read_text()
    verifier = (ROOT / "scripts" / "verify-deployment.mjs").read_text()
    assert 'classification: "INDEPENDENT_AUTHORITATIVE_RECORDS"' in evidence
    assert "measurement_independence: true" in evidence
    assert "USGS and EMSC independently catalog the same event" in publishers
    assert "USGS + EMSC independent authority records" in home
    assert "does not pause, modify, or make claims about any external production payments system" in service
    assert 'receipt.data?.contract_code' in verifier
    assert 'TransactionHashVariant.LATEST_FINAL' in verifier
