# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
import re
from datetime import datetime, timezone
from genlayer import *


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


class CovenantBook(gl.Contract):
    covenants: TreeMap[str, str]
    active_by_service: TreeMap[str, str]
    service_owners: TreeMap[str, str]
    versions: TreeMap[str, u256]
    covenant_keys: DynArray[str]

    def __init__(self):
        pass

    def _key(self, value: str) -> str:
        value = str(value).strip()
        if not re.fullmatch(r"[A-Za-z0-9._:-]{4,96}", value):
            raise gl.vm.UserError("invalid key")
        return value

    @gl.public.write
    def publish_covenant(self, covenant_key: str, service_key: str, service_name: str, remedy_policy: str, evidence_policy: str, publishers_json: str, actions_json: str, minimum_publishers: int, observation_max_age_minutes: int, mandate_ttl_minutes: int, activation_delay_minutes: int) -> str:
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
        if len(str(remedy_policy).strip()) < 120 or len(str(evidence_policy).strip()) < 80:
            raise gl.vm.UserError("policies are not sufficiently specific")
        try:
            publishers = publishers_json if isinstance(publishers_json, list) else json.loads(publishers_json)
            actions = actions_json if isinstance(actions_json, list) else json.loads(actions_json)
        except Exception:
            raise gl.vm.UserError("publishers and actions must be JSON arrays")
        if not isinstance(publishers, list) or len(publishers) < 2 or len(publishers) > 12 or len(set(publishers)) != len(publishers):
            raise gl.vm.UserError("provide 2 to 12 unique publisher keys")
        if int(minimum_publishers) < 2 or int(minimum_publishers) > len(publishers):
            raise gl.vm.UserError("minimum corroboration must be at least two")
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
        if int(observation_max_age_minutes) < 5 or int(observation_max_age_minutes) > 1440:
            raise gl.vm.UserError("invalid observation age")
        if int(mandate_ttl_minutes) < 5 or int(mandate_ttl_minutes) > 120:
            raise gl.vm.UserError("invalid mandate TTL")
        if int(activation_delay_minutes) < 1 or int(activation_delay_minutes) > 10080:
            raise gl.vm.UserError("invalid activation delay")
        now = _now()
        version = int(self.versions.get(service, u256(0))) + 1
        self.versions[service] = u256(version)
        frozen = {
            "covenant_key": key, "service_key": service, "service_name": str(service_name).strip(),
            "owner": sender, "remedy_policy": str(remedy_policy).strip(), "evidence_policy": str(evidence_policy).strip(),
            "publisher_keys": publishers, "actions": clean_actions, "minimum_publishers": int(minimum_publishers),
            "observation_max_age_minutes": int(observation_max_age_minutes), "mandate_ttl_minutes": int(mandate_ttl_minutes),
            "activation_delay_minutes": int(activation_delay_minutes), "published_at": now,
            "eligible_at": now + int(activation_delay_minutes) * 60, "version": version,
        }
        record = dict(frozen)
        record["covenant_digest"] = hashlib.sha256(json.dumps(frozen, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
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
        self.active_by_service[item["service_key"]] = covenant_key
        return covenant_key

    @gl.public.view
    def get_covenant_json(self, key: str) -> str:
        return self.covenants.get(key, "")

    @gl.public.view
    def get_active_covenant_key(self, service_key: str) -> str:
        return self.active_by_service.get(service_key, "")

    @gl.public.view
    def list_covenant_keys(self) -> list:
        return [self.covenant_keys[i] for i in range(len(self.covenant_keys))]
