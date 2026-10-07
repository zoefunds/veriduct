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
