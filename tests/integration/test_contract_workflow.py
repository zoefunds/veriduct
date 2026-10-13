import hashlib
import importlib.util
import json
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


class UserError(Exception):
    pass


class Address:
    def __init__(self, value):
        raw = value.as_hex if hasattr(value, "as_hex") else str(value)
        if not raw.startswith("0x") or len(raw) != 42:
            raise ValueError(f"invalid address {raw}")
        self.as_hex = raw.lower()

    def __str__(self):
        return self.as_hex


class TreeMap(dict):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


class DynArray(list):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class Public:
    @staticmethod
    def write(fn):
        def wrapped(self, *args, **kwargs):
            previous = GL.current_contract
            GL.current_contract = self._caller_address
            try:
                return fn(self, *args, **kwargs)
            finally:
                GL.current_contract = previous
        return wrapped

    @staticmethod
    def view(fn):
        return fn


class Message:
    sender_address = Address("0x" + "01" * 20)
    origin_address = sender_address


class Web:
    bodies = {}

    @classmethod
    def get(cls, url):
        return types.SimpleNamespace(status=200, body=cls.bodies[url])


class Nondet:
    web = Web

    @staticmethod
    def exec_prompt(prompt, response_format="json"):
        if prompt.startswith("Compare these two"):
            return {"equivalent": True}
        keys = []
        for key in ("usgs-snapshot", "emsc-snapshot"):
            if key in prompt:
                keys.append(key)
        return {
            "decision": "BREACH_PROVEN",
            "summary": "Two independent authoritative catalogs identify the same magnitude 8.8 earthquake.",
            "applied_covenant_clauses": ["Magnitude at or above 8.0 confirmed by both authorities."],
            "findings": ["USGS and EMSC agree on magnitude, origin time, and location."],
            "snapshot_states": [{"snapshot_key": key, "state": "SUPPORTS_BREACH", "finding": "Independent catalog supports the threshold."} for key in keys],
        }


class EmitProxy:
    def __init__(self, contract):
        self.contract = contract

    def __getattr__(self, name):
        target = getattr(self.contract, name)

        def invoke(*args):
            if GL.drop_next_finalized_emit:
                GL.drop_next_finalized_emit = False
                GL.dropped_finalized_calls.append({"contract": self.contract, "method": name, "args": args})
                return None
            previous = Message.sender_address
            Message.sender_address = Address(GL.current_contract)
            try:
                return target(*args)
            finally:
                Message.sender_address = previous
        return invoke


class Contract:
    def view(self):
        return self

    def emit(self, on):
        assert on == "finalized"
        return EmitProxy(self)


class GL:
    Contract = Contract
    public = Public
    message = Message
    nondet = Nondet
    vm = types.SimpleNamespace(UserError=UserError, Return=Return)
    contracts = {}
    drop_next_finalized_emit = False
    dropped_finalized_calls = []
    current_contract = addr = "0x" + "01" * 20

    @classmethod
    def get_contract_at(cls, address):
        return cls.contracts[Address(address).as_hex]

    @staticmethod
    def run_nondet_unsafe(leader_fn, validator_fn):
        leader = leader_fn()
        assert validator_fn(Return(leader))
        return leader


GL.vm.run_nondet_unsafe = GL.run_nondet_unsafe


def install_fake_genlayer():
    package = types.ModuleType("genlayer")
    package.gl = GL
    package.Address = Address
    package.TreeMap = TreeMap
    package.DynArray = DynArray
    package.u256 = int
    package.__all__ = ["gl", "Address", "TreeMap", "DynArray", "u256"]
    gl_module = types.ModuleType("genlayer.gl")
    vm_module = types.ModuleType("genlayer.gl.vm")
    vm_module.Return = Return
    sys.modules.update({"genlayer": package, "genlayer.gl": gl_module, "genlayer.gl.vm": vm_module})


def load_contract(name):
    spec = importlib.util.spec_from_file_location(f"actual_{name}", ROOT / "contracts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def storage(contract, maps=(), arrays=()):
    for name in maps:
        setattr(contract, name, TreeMap())
    for name in arrays:
        setattr(contract, name, DynArray())
    return contract


def addr(byte):
    return "0x" + byte * 40


@pytest.fixture()
def protocol():
    install_fake_genlayer()
    modules = {name: load_contract(name) for name in ("publisher_ledger", "covenant_book", "mandate_router", "adjudicator", "service_control")}
    clock = {"now": 1_753_836_000}
    for module in modules.values():
        module._now = lambda clock=clock: clock["now"]
    curator, owner, claimant, stranger = addr("1"), addr("2"), addr("3"), addr("4")
    addresses = {"ledger": addr("a"), "book": addr("b"), "router": addr("c"), "adjudicator": addr("d"), "service": addr("e")}
    Message.sender_address = Address(curator)
    Message.origin_address = Address(curator)
    ledger = storage(modules["publisher_ledger"].PublisherLedger(), ("sources", "snapshots"), ("source_keys", "snapshot_keys"))
    ledger._caller_address = addresses["ledger"]
    ledger.register_authority_source("usgs-origin", "United States Geological Survey", "earthquake.usgs.gov", "/product/origin/", "GOVERNMENT", "https://www.usgs.gov/programs/earthquake-hazards")
    ledger.register_authority_source("emsc-catalog", "Euro-Mediterranean Seismological Centre", "www.seismicportal.eu", "/fdsnws/event/1/query", "INTERGOVERNMENTAL", "https://www.emsc-csem.org/")
    book = storage(modules["covenant_book"].CovenantBook(addresses["ledger"]), ("covenants", "active_by_service", "service_owners", "versions"), ("covenant_keys",))
    book._caller_address = addresses["book"]
    Message.sender_address = Address(owner)
    router = storage(modules["mandate_router"].MandateRouter(), ("adapters", "mandates"), ("mandate_keys",))
    router._caller_address = addresses["router"]
    adjudicator = storage(modules["adjudicator"].Adjudicator(addresses["ledger"], addresses["book"], addresses["router"]), ("cases",), ("case_keys",))
    adjudicator._caller_address = addresses["adjudicator"]
    service = storage(modules["service_control"].ServiceControl(addresses["router"]), ("operations", "applied_mandates"), ("mandate_history",))
    service._caller_address = addresses["service"]
    GL.contracts = {Address(addresses[name]).as_hex: value for name, value in (("ledger", ledger), ("book", book), ("router", router), ("adjudicator", adjudicator), ("service", service))}
    GL.drop_next_finalized_emit = False
    GL.dropped_finalized_calls = []
    router.bind_adjudicator(addresses["adjudicator"])
    router.register_adapter("ENTER_READ_ONLY", addresses["service"], modules["service_control"].READ_ONLY_SCHEMA)
    usgs_url = "https://earthquake.usgs.gov/product/origin/us6000qw60/us/1760216255040/quakeml.xml"
    emsc_url = "https://www.seismicportal.eu/fdsnws/event/1/query?catalog=EMSC-RTS&source_id=1838723&format=json"
    Web.bodies = {usgs_url: b"USGS M8.8 2025-07-29T23:24:52Z 52.495 160.240", emsc_url: b"EMSC mw 8.8 2025-07-29T23:24:51Z 52.605 160.0725"}
    Message.sender_address = Address(claimant)
    for key, source, url in (("usgs-snapshot", "usgs-origin", usgs_url), ("emsc-snapshot", "emsc-catalog", emsc_url)):
        ledger.anchor_snapshot(key, source, url, hashlib.sha256(Web.bodies[url]).hexdigest(), clock["now"] - 60, 7200)
    Message.sender_address = Address(owner)
    remedy = "When USGS and EMSC independently report the same earthquake at magnitude 8.0 or greater within compatible time and location tolerances, validators may place the demonstration ServiceControl adapter into read-only mode for no more than two hours."
    evidence = "Validators must independently fetch exact bytes from the protocol-registered USGS and EMSC authority scopes, verify SHA-256 commitments, compare event identity, magnitude, time, latitude and longitude, and fail closed on missing, altered, or conflicting observations."
    actions = [{"action_id": "ENTER_READ_ONLY", "target": addresses["service"], "max_intensity": 80, "payload_schema_digest": modules["service_control"].READ_ONLY_SCHEMA}]
    book.publish_covenant("seismic-safety-v1", "veriduct-seismic-control", "VERIDUCT Seismic Safety Control", remedy, evidence, json.dumps(["usgs-origin", "emsc-catalog"]), json.dumps(["GOVERNMENT", "INTERGOVERNMENTAL"]), "PERMISSIONLESS", "[]", json.dumps(actions), 2, 525600, 30, 1)
    clock["now"] += 61
    book.activate_covenant("seismic-safety-v1")
    return types.SimpleNamespace(modules=modules, clock=clock, curator=curator, owner=owner, claimant=claimant, stranger=stranger, addresses=addresses, ledger=ledger, book=book, router=router, adjudicator=adjudicator, service=service)


def open_case(p, key="quake-case-1", payload=None):
    Message.sender_address = Address(p.claimant)
    Message.origin_address = Address(p.claimant)
    if payload is None:
        payload = {"reason": "Independent authorities confirmed a magnitude 8.8 seismic event.", "until": p.clock["now"] + 1200}
    p.adjudicator.open_case(key, "seismic-safety-v1", "ENTER_READ_ONLY", 60, json.dumps(payload), "USGS and EMSC independently catalog the same M8.8 Kamchatka earthquake.", json.dumps(["usgs-snapshot", "emsc-snapshot"]))


def issue_mandate(p):
    open_case(p)
    Message.sender_address = Address(p.stranger)
    p.adjudicator.adjudicate("quake-case-1")
    return json.loads(p.router.get_mandate_json("MANDATE-quake-case-1"))


def test_actual_five_contract_permissionless_workflow(protocol):
    mandate = issue_mandate(protocol)
    assert mandate["requester"] == protocol.claimant
    Message.sender_address = Address(protocol.stranger)
    protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])
    dispatched = json.loads(protocol.router.get_mandate_json("MANDATE-quake-case-1"))
    assert dispatched["status"] == "DISPATCHED" and dispatched["dispatch_count"] == 1
    assert protocol.router.reconcile_mandate("MANDATE-quake-case-1") == "APPLIED"
    assert protocol.service.get_applied_mandate_digest("MANDATE-quake-case-1") == mandate["action_digest"]


def test_duplicate_dispatch_is_rejected_from_dispatched_and_applied(protocol):
    mandate = issue_mandate(protocol)
    Message.sender_address = Address(protocol.stranger)
    args = ("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])
    protocol.router.execute_mandate(*args)
    with pytest.raises(UserError, match="not executable"):
        protocol.router.execute_mandate(*args)
    protocol.router.reconcile_mandate("MANDATE-quake-case-1")
    with pytest.raises(UserError, match="not executable"):
        protocol.router.execute_mandate(*args)


def test_expired_issued_mandate_cannot_execute(protocol):
    mandate = issue_mandate(protocol)
    protocol.clock["now"] = mandate["expires_at"] + 1
    with pytest.raises(UserError, match="expired"):
        protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])
    assert len(protocol.service.mandate_history) == 0


@pytest.mark.parametrize("status", ["DISPATCHED", "APPLIED", "FAILED", "EXPIRED"])
def test_every_nonissued_state_blocks_execution(protocol, status):
    mandate = issue_mandate(protocol)
    mandate["status"] = status
    protocol.router.mandates["MANDATE-quake-case-1"] = json.dumps(mandate, sort_keys=True)
    with pytest.raises(UserError, match="not executable"):
        protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])


@pytest.mark.parametrize("payload", [
    {},
    {"reason": "too short", "until": 1_753_900_000},
    {"reason": "A valid-length reason but no expiry field is included."},
    {"reason": "A valid-length reason with an unexpected field included.", "until": 1_753_900_000, "recipient": "0xdead"},
    {"reason": "A valid-length reason with the wrong expiry data type.", "until": "1753900000"},
])
def test_malformed_payloads_are_rejected_before_case_creation(protocol, payload):
    with pytest.raises(UserError, match="schema validation"):
        open_case(protocol, payload=payload)
    assert protocol.adjudicator.get_case_json("quake-case-1") == ""


def test_manipulated_evidence_fails_closed(protocol):
    usgs = json.loads(protocol.ledger.get_snapshot_json("usgs-snapshot"))
    usgs["content_digest"] = "00" * 32
    protocol.ledger.snapshots["usgs-snapshot"] = json.dumps(usgs, sort_keys=True)
    open_case(protocol)
    Message.sender_address = Address(protocol.stranger)
    verdict = protocol.adjudicator.adjudicate("quake-case-1")
    assert verdict["decision"] == "INSUFFICIENT_CORROBORATION"
    assert protocol.router.get_mandate_json("MANDATE-quake-case-1") == ""


def test_permissionless_claim_does_not_require_service_owner(protocol):
    open_case(protocol)
    case = json.loads(protocol.adjudicator.get_case_json("quake-case-1"))
    assert case["requester"] == protocol.claimant
    assert case["service_owner"] == protocol.owner


def test_recovery_only_reconciles_and_never_redispatches(protocol):
    mandate = issue_mandate(protocol)
    Message.sender_address = Address(protocol.stranger)
    protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])
    assert protocol.router.recover_dispatch("MANDATE-quake-case-1") == "APPLIED"
    recovered = json.loads(protocol.router.get_mandate_json("MANDATE-quake-case-1"))
    assert recovered["dispatch_count"] == 1
    assert len(protocol.service.mandate_history) == 1


def test_delayed_then_missing_receipt_uses_actual_recovery_without_redispatch(protocol):
    mandate = issue_mandate(protocol)
    Message.sender_address = Address(protocol.stranger)
    GL.drop_next_finalized_emit = True
    protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])

    dispatched = json.loads(protocol.router.get_mandate_json("MANDATE-quake-case-1"))
    assert dispatched["status"] == "DISPATCHED"
    assert dispatched["dispatch_count"] == 1
    assert dispatched["dispatch_tx_state"] == "FINALITY_PENDING"
    assert len(GL.dropped_finalized_calls) == 1
    assert len(protocol.service.mandate_history) == 0

    assert protocol.router.recover_dispatch("MANDATE-quake-case-1") == "DISPATCHED"
    delayed = json.loads(protocol.router.get_mandate_json("MANDATE-quake-case-1"))
    assert delayed["dispatch_count"] == 1
    assert delayed["dispatch_tx_state"] == "FINALITY_PENDING"
    assert len(GL.dropped_finalized_calls) == 1
    assert len(protocol.service.mandate_history) == 0

    protocol.clock["now"] = mandate["expires_at"] + 1
    assert protocol.router.recover_dispatch("MANDATE-quake-case-1") == "EXPIRED"
    expired = json.loads(protocol.router.get_mandate_json("MANDATE-quake-case-1"))
    assert expired["dispatch_count"] == 1
    assert expired["dispatch_tx_state"] == "NO_RECEIPT_BEFORE_EXPIRY"
    assert len(GL.dropped_finalized_calls) == 1
    assert len(protocol.service.mandate_history) == 0


def test_conflicting_receipt_marks_failed_without_redispatch(protocol):
    mandate = issue_mandate(protocol)
    Message.sender_address = Address(protocol.stranger)
    GL.drop_next_finalized_emit = True
    protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])
    protocol.service.applied_mandates["MANDATE-quake-case-1"] = "ff" * 32

    assert protocol.router.recover_dispatch("MANDATE-quake-case-1") == "FAILED"
    failed = json.loads(protocol.router.get_mandate_json("MANDATE-quake-case-1"))
    assert failed["dispatch_count"] == 1
    assert failed["dispatch_tx_state"] == "CONFLICTING_RECEIPT"
    assert failed["action_digest"] != protocol.service.get_applied_mandate_digest("MANDATE-quake-case-1")
    assert len(GL.dropped_finalized_calls) == 1
    assert len(protocol.service.mandate_history) == 0

    assert protocol.router.recover_dispatch("MANDATE-quake-case-1") == "FAILED"
    with pytest.raises(UserError, match="not executable"):
        protocol.router.execute_mandate("MANDATE-quake-case-1", protocol.addresses["service"], "ENTER_READ_ONLY", 60, mandate["payload_json"])
    assert len(GL.dropped_finalized_calls) == 1
    assert len(protocol.service.mandate_history) == 0
