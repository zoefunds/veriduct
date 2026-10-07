import hashlib
import json
import pytest


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class Protocol:
    def __init__(self):
        self.publishers = {}
        self.adapters = {}
        self.mandates = {}
        self.applied = {}

    def publisher(self, key, owner, host):
        assert key not in self.publishers
        self.publishers[key] = (owner, host)

    def snapshot(self, key, publisher, caller, host, body):
        owner, registered_host = self.publishers[publisher]
        assert caller == owner and host == registered_host
        return {"key": key, "publisher": publisher, "digest": hashlib.sha256(body).hexdigest()}

    def register_adapter(self, action, target, schema, caller, governance):
        assert caller == governance
        assert action not in self.adapters or self.adapters[action][0] == target
        self.adapters[action] = (target, schema, governance)

    def issue(self, key, holder, envelope, covenant_owner, decision, snapshots, minimum=2):
        assert decision == "BREACH_PROVEN"
        assert len({x["publisher"] for x in snapshots}) >= minimum
        assert len({self.publishers[x["publisher"]][0] for x in snapshots}) >= minimum
        target, schema, governance = self.adapters[envelope["action_id"]]
        assert covenant_owner == governance
        assert envelope["target"] == target and envelope["schema"] == schema
        self.mandates[key] = {"holder": holder, "envelope": envelope, "digest": digest(envelope), "status": "ISSUED"}

    def execute(self, key, caller, envelope):
        item = self.mandates[key]
        assert caller == item["holder"] and item["status"] == "ISSUED"
        assert digest(envelope) == item["digest"]
        assert key not in self.applied
        item["status"] = "APPLIED"
        self.applied[key] = item["digest"]


def setup_protocol():
    p = Protocol()
    p.publisher("primary", "publisher-a", "status.alpha")
    p.publisher("independent", "publisher-b", "monitor.beta")
    p.register_adapter("ENTER_READ_ONLY", "service-1", "schema-1", "service-owner", "service-owner")
    snapshots = [p.snapshot("s1", "primary", "publisher-a", "status.alpha", b"down"), p.snapshot("s2", "independent", "publisher-b", "monitor.beta", b"down")]
    envelope = {"case":"c1","covenant":"v1","target":"service-1","action_id":"ENTER_READ_ONLY","intensity":60,"payload":"{\"until\":9}","schema":"schema-1"}
    return p, snapshots, envelope


def test_complete_registry_to_target_happy_path():
    p, snapshots, envelope = setup_protocol()
    p.issue("m1", "service-owner", envelope, "service-owner", "BREACH_PROVEN", snapshots)
    p.execute("m1", "service-owner", envelope)
    assert p.mandates["m1"]["status"] == "APPLIED"


@pytest.mark.parametrize("mutation", ["target", "action_id", "intensity", "payload", "schema", "case", "covenant"])
def test_every_envelope_field_is_tamper_evident(mutation):
    p, snapshots, envelope = setup_protocol()
    p.issue("m1", "service-owner", envelope, "service-owner", "BREACH_PROVEN", snapshots)
    altered = dict(envelope); altered[mutation] = "attacker" if mutation != "intensity" else 100
    with pytest.raises(AssertionError): p.execute("m1", "service-owner", altered)


def test_fresh_protocol_key_cannot_seize_existing_target():
    p, snapshots, envelope = setup_protocol()
    with pytest.raises(AssertionError): p.issue("m1", "attacker", envelope, "attacker", "BREACH_PROVEN", snapshots)


def test_same_publisher_cannot_fake_quorum():
    p, snapshots, envelope = setup_protocol()
    with pytest.raises(AssertionError): p.issue("m1", "service-owner", envelope, "service-owner", "BREACH_PROVEN", [snapshots[0], snapshots[0]])


def test_multiple_keys_owned_by_one_wallet_cannot_fake_quorum():
    p, snapshots, envelope = setup_protocol()
    p.publisher("provider-alias", "publisher-a", "alias.alpha")
    alias = p.snapshot("s3", "provider-alias", "publisher-a", "alias.alpha", b"down")
    with pytest.raises(AssertionError): p.issue("m1", "service-owner", envelope, "service-owner", "BREACH_PROVEN", [snapshots[0], alias])


def test_non_proven_verdict_cannot_mint_authority():
    p, snapshots, envelope = setup_protocol()
    with pytest.raises(AssertionError): p.issue("m1", "service-owner", envelope, "service-owner", "NO_BREACH", snapshots)


def test_replay_fails_after_target_application():
    p, snapshots, envelope = setup_protocol(); p.issue("m1", "service-owner", envelope, "service-owner", "BREACH_PROVEN", snapshots); p.execute("m1", "service-owner", envelope)
    with pytest.raises(AssertionError): p.execute("m1", "service-owner", envelope)


def test_publisher_identity_and_origin_are_both_enforced():
    p, _, _ = setup_protocol()
    with pytest.raises(AssertionError): p.snapshot("bad", "primary", "attacker", "status.alpha", b"forged")
    with pytest.raises(AssertionError): p.snapshot("bad", "primary", "publisher-a", "evil.example", b"forged")
