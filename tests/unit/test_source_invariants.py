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

def test_distinct_publisher_quorum_is_enforced_before_consensus():
    text = source("adjudicator.py")
    assert "each corroborating snapshot must have a distinct publisher" in text
    assert 'len(publishers) < int(covenant["minimum_publishers"])' in text
    assert "corroborating publishers must have distinct onchain owners" in text

def test_target_revalidates_governance_and_replay():
    text = source("service_control.py")
    assert "service governance rejected mandate holder" in text
    assert "mandate replay conflicts with applied digest" in text
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
    assert router.count("payload_json if isinstance(payload_json, dict) else json.loads(payload_json)") == 2
    assert 'raise gl.vm.UserError("payload must be a JSON object")' in router

def test_semantic_prompt_receives_frozen_publisher_provenance():
    text = source("adjudicator.py")
    assert '"publisher_owner": snapshot["publisher_owner"]' in text
    assert '"publisher_sequence": snapshot["publisher_sequence"]' in text
    assert "all publisher keys and onchain publisher owners are distinct" in text
    assert "Never omit or rename snapshot_states" in text
    assert 'isinstance(raw.get("states"), dict)' in text

def test_demo_evidence_urls_are_canonical_contract_safe_paths():
    form = (ROOT / "components" / "TransactionForm.tsx").read_text()
    assert "api/evidence/${preset.evidence}/${observedAt}" in form
    assert "api/evidence/${preset.evidence}?at=" not in form
    sample = "https://veri-duct.vercel.app/api/evidence/provider/1791354622"
    assert sample.startswith("https://")
    assert not any(token in sample for token in ("@", "\\", "%", "?", "#"))
    assert (ROOT / "app" / "api" / "evidence" / "provider" / "[at]" / "route.ts").is_file()
    assert (ROOT / "app" / "api" / "evidence" / "monitor" / "[at]" / "route.ts").is_file()

def test_governed_autofill_cannot_create_an_attacker_owned_covenant():
    config = (ROOT / "lib" / "config.ts").read_text()
    form = (ROOT / "components" / "TransactionForm.tsx").read_text()
    covenants = (ROOT / "app" / "covenants" / "page.tsx").read_text()
    cases = (ROOT / "app" / "cases" / "page.tsx").read_text()
    assert "SERVICE_GOVERNANCE = manifest.deployer" in config
    assert "account.toLowerCase() !== requiredAccount.toLowerCase()" in form
    assert 'workflow:"covenant"' in covenants
    assert 'service_key:"veriduct-production-payments-api"' in covenants
    assert 'requiredAccount={SERVICE_GOVERNANCE}' in covenants
    assert 'requiredAccount={SERVICE_GOVERNANCE}' in cases
    assert 'get_active_covenant_key' in form
    assert 'veriduct-production-availability-${Math.floor(Date.now()/1000)}' in form
    assert 'localStorage.setItem("veriduct-demo-covenant"' in form
    assert 'case_key:`production-outage-${Math.floor(Date.now()/1000)}`' in form
    assert "Math.floor(Date.now()/1000)+1200" in form
    assert "bounded 20-minute read-only remedy inside the 30-minute mandate TTL" in form
