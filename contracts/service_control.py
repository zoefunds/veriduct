# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
from datetime import datetime, timezone
from genlayer import *


READ_ONLY_SCHEMA = hashlib.sha256(b'{"reason":"string","until":"unix"}').hexdigest()
REVIEW_SCHEMA = hashlib.sha256(b'{"queue":"string","reason":"string"}').hexdigest()


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

    @gl.public.view
    def get_governance_address(self) -> str:
        return self.governance_address

    @gl.public.view
    def supports_action(self, action_id: str, schema_digest: str) -> bool:
        return (action_id == "ENTER_READ_ONLY" and schema_digest == READ_ONLY_SCHEMA) or (action_id == "RAISE_REVIEW_THRESHOLD" and schema_digest == REVIEW_SCHEMA)

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
    def apply_mandate(self, action_id: str, intensity: int, payload_json: str, mandate_key: str, action_digest: str, holder: str) -> str:
        if _addr(gl.message.sender_address) != self.router_address:
            raise gl.vm.UserError("only MandateRouter may apply remedies")
        if _addr(holder) != self.governance_address:
            raise gl.vm.UserError("service governance rejected mandate holder")
        existing = self.applied_mandates.get(mandate_key, "")
        if existing:
            if existing != action_digest:
                raise gl.vm.UserError("mandate replay conflicts with applied digest")
            return action_id
        payload = json.loads(payload_json)
        if action_id == "ENTER_READ_ONLY":
            until = int(payload.get("until", 0))
            if until <= _now() or until > _now() + 86400 or int(intensity) > 100:
                raise gl.vm.UserError("read-only payload exceeds adapter bounds")
            if until > int(self.read_only_until):
                self.read_only_until = u256(until)
        elif action_id == "RAISE_REVIEW_THRESHOLD":
            if int(intensity) < 1 or int(intensity) > 100:
                raise gl.vm.UserError("review threshold outside adapter bounds")
            self.review_threshold = u256(intensity)
        else:
            raise gl.vm.UserError("unsupported action for this adapter")
        record = json.dumps({"mandate_key": mandate_key, "action_id": action_id, "intensity": int(intensity), "payload": payload, "action_digest": action_digest, "applied_at": _now()}, sort_keys=True)
        self.applied_mandates[mandate_key] = action_digest
        self.mandate_history.append(record)
        return action_id

    @gl.public.view
    def get_applied_mandate_digest(self, key: str) -> str:
        return self.applied_mandates.get(key, "")

    @gl.public.view
    def get_status_json(self) -> str:
        return json.dumps({"governance_address": self.governance_address, "router_address": self.router_address, "read_only_until": int(self.read_only_until), "read_only": _now() < int(self.read_only_until), "review_threshold": int(self.review_threshold), "operation_count": str(self.operation_count), "applied_mandate_count": len(self.mandate_history)}, sort_keys=True)
