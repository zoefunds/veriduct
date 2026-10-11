# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
import re
from datetime import datetime, timezone
from genlayer import *


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _address_hex(value) -> str:
    return value.as_hex if hasattr(value, "as_hex") else Address(value).as_hex


class MandateRouter(gl.Contract):
    deployer: str
    adjudicator_address: str
    adapters: TreeMap[str, str]
    mandates: TreeMap[str, str]
    mandate_keys: DynArray[str]

    def __init__(self):
        self.deployer = gl.message.sender_address.as_hex
        self.adjudicator_address = ""

    def _key(self, value: str) -> str:
        value = str(value).strip()
        if not re.fullmatch(r"[A-Za-z0-9._:-]{4,96}", value):
            raise gl.vm.UserError("invalid key")
        return value

    def _digest(self, payload: dict) -> str:
        return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

    @gl.public.write
    def bind_adjudicator(self, address: str) -> str:
        if gl.message.sender_address.as_hex != self.deployer or self.adjudicator_address:
            raise gl.vm.UserError("adjudicator binding is deployer-only and one-time")
        self.adjudicator_address = _address_hex(address)
        return self.adjudicator_address

    @gl.public.write
    def register_adapter(self, action_id: str, target: str, payload_schema_digest: str) -> str:
        action = self._key(action_id)
        target_hex = _address_hex(target)
        schema = str(payload_schema_digest).lower()
        if not re.fullmatch(r"[0-9a-f]{64}", schema):
            raise gl.vm.UserError("invalid payload schema digest")
        adapter = gl.get_contract_at(Address(target_hex))
        governance = Address(str(adapter.view().get_governance_address())).as_hex
        if governance != gl.message.sender_address.as_hex:
            raise gl.vm.UserError("only target governance may register an adapter")
        if not bool(adapter.view().supports_action(action, schema)):
            raise gl.vm.UserError("target does not attest this action schema")
        existing = self.adapters.get(action, "")
        if existing and json.loads(existing)["target"] != target_hex:
            raise gl.vm.UserError("action id already routes to another target")
        self.adapters[action] = json.dumps({"action_id": action, "target": target_hex, "payload_schema_digest": schema, "governance": governance}, sort_keys=True)
        return action

    @gl.public.write
    def issue_mandate(self, mandate_key: str, case_key: str, holder: str, target: str, action_id: str, intensity: int, payload_json: str, payload_schema_digest: str, covenant_digest: str, verdict_digest: str, ttl_seconds: int) -> str:
        if not self.adjudicator_address or gl.message.sender_address.as_hex != self.adjudicator_address:
            raise gl.vm.UserError("only bound adjudicator may issue mandates")
        key = self._key(mandate_key)
        if key in self.mandates:
            raise gl.vm.UserError("mandate already exists")
        adapter_raw = self.adapters.get(self._key(action_id), "")
        if not adapter_raw:
            raise gl.vm.UserError("action has no registered adapter")
        adapter = json.loads(adapter_raw)
        target_hex = _address_hex(target)
        if target_hex != adapter["target"] or str(payload_schema_digest) != adapter["payload_schema_digest"]:
            raise gl.vm.UserError("adapter binding mismatch")
        if int(intensity) < 1 or int(intensity) > 100 or int(ttl_seconds) < 60 or int(ttl_seconds) > 7200:
            raise gl.vm.UserError("mandate bounds invalid")
        try:
            payload = payload_json if isinstance(payload_json, dict) else json.loads(payload_json)
        except Exception:
            raise gl.vm.UserError("payload must be canonical JSON")
        canonical_payload = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        envelope = {
            "case_key": case_key, "covenant_digest": covenant_digest, "target": target_hex,
            "action_id": action_id, "intensity": int(intensity), "payload_json": canonical_payload,
            "payload_schema_digest": payload_schema_digest,
        }
        now = _now()
        record = dict(envelope)
        record.update({
            "mandate_key": key, "holder": Address(holder).as_hex, "verdict_digest": verdict_digest,
            "action_digest": self._digest(envelope), "issued_at": now, "expires_at": now + int(ttl_seconds),
            "status": "ISSUED", "dispatch_count": 0,
        })
        self.mandates[key] = json.dumps(record, sort_keys=True)
        self.mandate_keys.append(key)
        return key

    @gl.public.write
    def execute_mandate(self, mandate_key: str, target: str, action_id: str, intensity: int, payload_json: str) -> str:
        raw = self.mandates.get(mandate_key, "")
        if not raw:
            raise gl.vm.UserError("mandate not found")
        record = json.loads(raw)
        if gl.message.sender_address.as_hex != record["holder"]:
            raise gl.vm.UserError("only mandate holder may execute")
        if record["status"] == "APPLIED":
            raise gl.vm.UserError("mandate already applied")
        if record["status"] == "ISSUED" and _now() > int(record["expires_at"]):
            raise gl.vm.UserError("mandate expired")
        decoded_payload = payload_json if isinstance(payload_json, dict) else json.loads(payload_json)
        if not isinstance(decoded_payload, dict):
            raise gl.vm.UserError("payload must be a JSON object")
        canonical_payload = json.dumps(decoded_payload, sort_keys=True, separators=(",", ":"))
        envelope = {
            "case_key": record["case_key"], "covenant_digest": record["covenant_digest"],
            "target": _address_hex(target), "action_id": action_id, "intensity": int(intensity),
            "payload_json": canonical_payload, "payload_schema_digest": record["payload_schema_digest"],
        }
        if self._digest(envelope) != record["action_digest"]:
            raise gl.vm.UserError("mandate envelope digest mismatch")
        adapter = json.loads(self.adapters.get(action_id, "{}"))
        if adapter.get("target") != envelope["target"]:
            raise gl.vm.UserError("live adapter route mismatch")
        record["status"] = "DISPATCHED"
        record["dispatch_count"] = int(record["dispatch_count"]) + 1
        record["dispatched_at"] = record.get("dispatched_at", _now())
        self.mandates[mandate_key] = json.dumps(record, sort_keys=True)
        target_contract = gl.get_contract_at(Address(envelope["target"]))
        target_contract.emit(on="finalized").apply_mandate(action_id, int(intensity), canonical_payload, mandate_key, record["action_digest"], record["holder"])
        return action_id

    @gl.public.write
    def reconcile_mandate(self, mandate_key: str) -> str:
        raw = self.mandates.get(mandate_key, "")
        if not raw:
            raise gl.vm.UserError("mandate not found")
        record = json.loads(raw)
        if gl.message.sender_address.as_hex != record["holder"]:
            raise gl.vm.UserError("only mandate holder may reconcile")
        if record["status"] == "DISPATCHED":
            target = gl.get_contract_at(Address(record["target"]))
            if str(target.view().get_applied_mandate_digest(mandate_key)) == record["action_digest"]:
                record["status"] = "APPLIED"
                record["applied_at"] = _now()
                self.mandates[mandate_key] = json.dumps(record, sort_keys=True)
        return record["status"]

    @gl.public.view
    def get_adapter_json(self, action_id: str) -> str:
        return self.adapters.get(action_id, "")

    @gl.public.view
    def get_mandate_json(self, mandate_key: str) -> str:
        return self.mandates.get(mandate_key, "")

    @gl.public.view
    def list_mandate_keys(self) -> list:
        return [self.mandate_keys[i] for i in range(len(self.mandate_keys))]
