# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
import re
from datetime import datetime, timezone
from genlayer import *

CLAIM_MODES = ("PERMISSIONLESS", "ALLOWLIST")
SUPERSEDED_CLAIM_GRACE_SECONDS = 604800

def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())

def _address_hex(value) -> str:
    return value.as_hex if hasattr(value, "as_hex") else Address(value).as_hex

class CovenantBook(gl.Contract):
    ledger_address: str
    covenants: TreeMap[str, str]
    active_by_service: TreeMap[str, str]
    service_owners: TreeMap[str, str]
    versions: TreeMap[str, u256]
    covenant_keys: DynArray[str]

    def __init__(self, ledger_address: str):
        self.ledger_address = _address_hex(ledger_address)

    def _key(self, value: str) -> str:
        value = str(value).strip()
        if not re.fullmatch(r"[A-Za-z0-9._:-]{4,96}", value):
            raise gl.vm.UserError("invalid key")
        return value

    @gl.public.write
    def publish_covenant(self, covenant_key: str, service_key: str, service_name: str, remedy_policy: str, evidence_policy: str, sources_json: str, required_source_classes_json: str, claim_mode: str, claimants_json: str, actions_json: str, minimum_sources: int, observation_max_age_minutes: int, mandate_ttl_minutes: int, activation_delay_minutes: int) -> str:
        key = self._key(covenant_key)
        service = self._key(service_key)
        if key in self.covenants:
            raise gl.vm.UserError("covenant already exists")
        sender = gl.message.sender_address.as_hex
        owner = self.service_owners.get(service, "")
        if owner and owner != sender:
            raise gl.vm.UserError("only service owner may publish versions")
        if not owner:
            self.service_owners[service] = sender
        if len(str(remedy_policy).strip()) < 120 or len(str(evidence_policy).strip()) < 120:
            raise gl.vm.UserError("policies are not sufficiently specific")
        try:
            sources = sources_json if isinstance(sources_json, list) else json.loads(sources_json)
            required_classes = required_source_classes_json if isinstance(required_source_classes_json, list) else json.loads(required_source_classes_json)
            claimants = claimants_json if isinstance(claimants_json, list) else json.loads(claimants_json)
            actions = actions_json if isinstance(actions_json, list) else json.loads(actions_json)
        except Exception:
            raise gl.vm.UserError("covenant collections must be JSON arrays")
        if not isinstance(sources, list) or len(sources) < 2 or len(sources) > 12 or len(set(sources)) != len(sources):
            raise gl.vm.UserError("provide 2 to 12 unique authority sources")
        if not isinstance(required_classes, list) or len(required_classes) < 2 or len(set(required_classes)) != len(required_classes):
            raise gl.vm.UserError("require at least two distinct authority classes")
        if int(minimum_sources) < 2 or int(minimum_sources) > len(sources):
            raise gl.vm.UserError("minimum corroboration must be at least two")
        ledger = gl.get_contract_at(Address(self.ledger_address))
        hosts, registered_classes = [], []
        for source_key in sources:
            source_raw = ledger.view().get_source_json(self._key(source_key))
            if not source_raw:
                raise gl.vm.UserError("covenant source is not in the verified authority registry")
            source = json.loads(source_raw)
            if not source.get("active") or source["origin_host"] in hosts:
                raise gl.vm.UserError("covenant sources must be active and use distinct authority hosts")
            hosts.append(source["origin_host"])
            registered_classes.append(source["source_class"])
        if any(value not in registered_classes for value in required_classes):
            raise gl.vm.UserError("required authority class is not represented")
        mode = str(claim_mode).strip().upper()
        if mode not in CLAIM_MODES:
            raise gl.vm.UserError("invalid claim mode")
        clean_claimants = []
        for claimant in claimants:
            address = Address(str(claimant)).as_hex
            if address not in clean_claimants:
                clean_claimants.append(address)
        if mode == "ALLOWLIST" and not clean_claimants:
            raise gl.vm.UserError("allowlisted claims require at least one counterparty")
        clean_actions = []
        for action in actions:
            if not isinstance(action, dict):
                raise gl.vm.UserError("invalid action descriptor")
            action_id = self._key(str(action.get("action_id", "")))
            target = Address(str(action.get("target", ""))).as_hex
            max_intensity = int(action.get("max_intensity", 0))
            schema_digest = str(action.get("payload_schema_digest", "")).lower()
            if max_intensity < 1 or max_intensity > 100 or not re.fullmatch(r"[0-9a-f]{64}", schema_digest):
                raise gl.vm.UserError("invalid action bounds")
            if any(x["action_id"] == action_id for x in clean_actions):
                raise gl.vm.UserError("duplicate action id")
            clean_actions.append({"action_id": action_id, "target": target, "max_intensity": max_intensity, "payload_schema_digest": schema_digest})
        if len(clean_actions) < 1 or len(clean_actions) > 8:
            raise gl.vm.UserError("provide 1 to 8 remedies")
        if int(observation_max_age_minutes) < 5 or int(observation_max_age_minutes) > 5256000:
            raise gl.vm.UserError("invalid observation age")
        if int(mandate_ttl_minutes) < 5 or int(mandate_ttl_minutes) > 120:
            raise gl.vm.UserError("invalid mandate TTL")
        if int(activation_delay_minutes) < 1 or int(activation_delay_minutes) > 10080:
            raise gl.vm.UserError("invalid activation delay")
        now = _now()
        version = int(self.versions.get(service, u256(0))) + 1
        self.versions[service] = u256(version)
        frozen = {"covenant_key": key, "service_key": service, "service_name": str(service_name).strip(), "owner": sender, "remedy_policy": str(remedy_policy).strip(), "evidence_policy": str(evidence_policy).strip(), "source_keys": sources, "required_source_classes": required_classes, "source_hosts": hosts, "claim_mode": mode, "claimants": clean_claimants, "actions": clean_actions, "minimum_sources": int(minimum_sources), "observation_max_age_minutes": int(observation_max_age_minutes), "mandate_ttl_minutes": int(mandate_ttl_minutes), "activation_delay_minutes": int(activation_delay_minutes), "published_at": now, "eligible_at": now + int(activation_delay_minutes) * 60, "version": version}
        record = dict(frozen)
        record.update({"covenant_digest": hashlib.sha256(json.dumps(frozen, sort_keys=True, separators=(",", ":")).encode()).hexdigest(), "activated_at": 0, "superseded_at": 0, "claimable_until": 0})
        self.covenants[key] = json.dumps(record, sort_keys=True)
        self.covenant_keys.append(key)
        return key

    @gl.public.write
    def activate_covenant(self, covenant_key: str) -> str:
        raw = self.covenants.get(covenant_key, "")
        if not raw:
            raise gl.vm.UserError("covenant not found")
        item = json.loads(raw)
        if gl.message.sender_address.as_hex != item["owner"] or _now() < int(item["eligible_at"]):
            raise gl.vm.UserError("covenant is not eligible for activation")
        current_key = self.active_by_service.get(item["service_key"], "")
        if current_key:
            current = json.loads(self.covenants[current_key])
            if int(item["version"]) <= int(current["version"]):
                raise gl.vm.UserError("cannot roll back covenant version")
            current["superseded_at"] = _now()
            current["claimable_until"] = _now() + SUPERSEDED_CLAIM_GRACE_SECONDS
            self.covenants[current_key] = json.dumps(current, sort_keys=True)
        item["activated_at"] = _now()
        self.covenants[covenant_key] = json.dumps(item, sort_keys=True)
        self.active_by_service[item["service_key"]] = covenant_key
        return covenant_key

    @gl.public.view
    def is_covenant_claimable(self, covenant_key: str) -> bool:
        raw = self.covenants.get(covenant_key, "")
        if not raw:
            return False
        item = json.loads(raw)
        if self.active_by_service.get(item["service_key"], "") == covenant_key:
            return True
        return int(item.get("claimable_until", 0)) >= _now()

    @gl.public.view
    def get_covenant_json(self, key: str) -> str:
        return self.covenants.get(key, "")

    @gl.public.view
    def get_active_covenant_key(self, service_key: str) -> str:
        return self.active_by_service.get(service_key, "")

    @gl.public.view
    def list_covenant_keys(self) -> list:
        return [self.covenant_keys[i] for i in range(len(self.covenant_keys))]
