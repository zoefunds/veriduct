# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
from datetime import datetime, timezone
from genlayer import *

READ_ONLY_SCHEMA = hashlib.sha256(b'{"reason":"string","until":"unix"}').hexdigest()
REVIEW_SCHEMA = hashlib.sha256(b'{"queue":"enum:all|payments|withdrawals","reason":"string"}').hexdigest()
QUEUES = ("all", "payments", "withdrawals")

def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())

def _addr(value) -> str:
    return value.as_hex.lower() if hasattr(value, "as_hex") else Address(value).as_hex.lower()

class ServiceControl(gl.Contract):
    router_address: str
    governance_address: str
    read_only_until: u256
    review_threshold: u256
    operation_count: u256
    operations: TreeMap[str, str]
    applied_mandates: TreeMap[str, str]
    mandate_history: DynArray[str]

    def __init__(self, router_address: str):
        self.router_address = _addr(router_address)
        self.governance_address = _addr(gl.message.sender_address)
        self.read_only_until = u256(0)
        self.review_threshold = u256(0)
        self.operation_count = u256(0)

    def _decode_payload(self, payload_json):
        try:
            payload = payload_json if isinstance(payload_json, dict) else json.loads(payload_json)
        except Exception:
            return None
        return payload if isinstance(payload, dict) else None

    def _valid_reason(self, value) -> bool:
        return isinstance(value, str) and 20 <= len(value.strip()) <= 280

    @gl.public.view
    def get_governance_address(self) -> str:
        return self.governance_address

    @gl.public.view
    def supports_action(self, action_id: str, schema_digest: str) -> bool:
        return (action_id == "ENTER_READ_ONLY" and schema_digest == READ_ONLY_SCHEMA) or (action_id == "RAISE_REVIEW_THRESHOLD" and schema_digest == REVIEW_SCHEMA)

    def _validate_payload(self, action_id: str, intensity: int, payload_json: str) -> bool:
        payload = self._decode_payload(payload_json)
        if payload is None or isinstance(intensity, bool) or int(intensity) < 1 or int(intensity) > 100:
            return False
        if action_id == "ENTER_READ_ONLY":
            if set(payload.keys()) != {"reason", "until"} or not self._valid_reason(payload.get("reason")):
                return False
            until = payload.get("until")
            return isinstance(until, int) and not isinstance(until, bool) and until > _now() and until <= _now() + 7200
        if action_id == "RAISE_REVIEW_THRESHOLD":
            return set(payload.keys()) == {"queue", "reason"} and payload.get("queue") in QUEUES and self._valid_reason(payload.get("reason"))
        return False

    @gl.public.view
    def validate_payload(self, action_id: str, intensity: int, payload_json: str) -> bool:
        return self._validate_payload(action_id, intensity, payload_json)

    @gl.public.write
    def submit_operation(self, operation_key: str, risk_score: int) -> u256:
        if _addr(gl.message.sender_address) != _addr(gl.message.origin_address):
            raise gl.vm.UserError("operations require a direct user")
        if _now() < int(self.read_only_until):
            raise gl.vm.UserError("service is in covenant-enforced read-only mode")
        key = str(operation_key).strip()
        if not key or len(key) > 128 or self.operations.get(key, ""):
            raise gl.vm.UserError("operation key invalid or already used")
        if int(risk_score) < int(self.review_threshold):
            raise gl.vm.UserError("operation does not meet the active review threshold")
        next_count = self.operation_count + u256(1)
        self.operations[key] = json.dumps({"operation_key": key, "actor": _addr(gl.message.sender_address), "risk_score": int(risk_score), "sequence": str(next_count), "executed_at": _now()}, sort_keys=True)
        self.operation_count = next_count
        return next_count

    @gl.public.write
    def apply_mandate(self, action_id: str, intensity: int, payload_json: str, mandate_key: str, action_digest: str, case_key: str, covenant_digest: str, expires_at: int) -> str:
        if _addr(gl.message.sender_address) != self.router_address:
            raise gl.vm.UserError("only MandateRouter may apply remedies")
        if _now() > int(expires_at):
            raise gl.vm.UserError("expired mandate cannot reach the adapter")
        if self.applied_mandates.get(mandate_key, ""):
            raise gl.vm.UserError("mandate already applied")
        if not self._validate_payload(action_id, int(intensity), payload_json):
            raise gl.vm.UserError("malformed or unauthorized remedy payload")
        payload = self._decode_payload(payload_json)
        if action_id == "ENTER_READ_ONLY":
            until = int(payload["until"])
            if until > int(self.read_only_until):
                self.read_only_until = u256(until)
        elif action_id == "RAISE_REVIEW_THRESHOLD":
            self.review_threshold = u256(int(intensity))
        record = json.dumps({"mandate_key": mandate_key, "case_key": case_key, "covenant_digest": covenant_digest, "action_id": action_id, "intensity": int(intensity), "payload": payload, "action_digest": action_digest, "expires_at": int(expires_at), "applied_at": _now()}, sort_keys=True)
        self.applied_mandates[mandate_key] = action_digest
        self.mandate_history.append(record)
        return action_id

    @gl.public.view
    def get_applied_mandate_digest(self, key: str) -> str:
        return self.applied_mandates.get(key, "")

    @gl.public.view
    def get_status_json(self) -> str:
        return json.dumps({"governance_address": self.governance_address, "router_address": self.router_address, "read_only_until": int(self.read_only_until), "read_only": _now() < int(self.read_only_until), "review_threshold": int(self.review_threshold), "operation_count": str(self.operation_count), "applied_mandate_count": len(self.mandate_history)}, sort_keys=True)
