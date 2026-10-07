# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
import re
from datetime import datetime, timezone
from genlayer import *


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


class PublisherLedger(gl.Contract):
    publishers: TreeMap[str, str]
    snapshots: TreeMap[str, str]
    snapshot_keys: DynArray[str]

    def __init__(self):
        pass

    def _key(self, value: str) -> str:
        value = str(value).strip()
        if not re.fullmatch(r"[A-Za-z0-9._:-]{4,96}", value):
            raise gl.vm.UserError("invalid key")
        return value

    def _url(self, value: str) -> str:
        value = str(value).strip()
        if not value.startswith("https://") or len(value) > 500 or any(ord(c) < 0x21 for c in value):
            raise gl.vm.UserError("snapshot URL must be canonical HTTPS")
        if any(token in value for token in ("@", "\\", "%", "?", "#")):
            raise gl.vm.UserError("snapshot URL contains ambiguous syntax")
        authority, _, path = value[8:].partition("/")
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", authority.lower()):
            raise gl.vm.UserError("invalid snapshot hostname")
        parts = path.split("/")
        if any(part in (".", "..") for part in parts):
            raise gl.vm.UserError("snapshot URL contains dot segment")
        return "https://" + authority.lower() + "/" + "/".join(x for x in parts if x)

    @gl.public.write
    def register_publisher(self, publisher_key: str, name: str, origin_host: str) -> str:
        key = self._key(publisher_key)
        if key in self.publishers:
            raise gl.vm.UserError("publisher already registered")
        host = str(origin_host).strip().lower()
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", host):
            raise gl.vm.UserError("invalid publisher origin")
        label = str(name).strip()
        if len(label) < 3 or len(label) > 120:
            raise gl.vm.UserError("invalid publisher name")
        record = {
            "publisher_key": key,
            "name": label,
            "owner": gl.message.sender_address.as_hex,
            "origin_host": host,
            "registered_at": _now(),
            "sequence": 0,
        }
        self.publishers[key] = json.dumps(record, sort_keys=True)
        return key

    @gl.public.write
    def anchor_snapshot(self, snapshot_key: str, publisher_key: str, url: str, content_digest: str, observed_at: int, valid_for_seconds: int) -> str:
        key = self._key(snapshot_key)
        if key in self.snapshots:
            raise gl.vm.UserError("snapshot already exists")
        raw = self.publishers.get(self._key(publisher_key), "")
        if not raw:
            raise gl.vm.UserError("publisher not found")
        publisher = json.loads(raw)
        if gl.message.sender_address.as_hex != str(publisher["owner"]):
            raise gl.vm.UserError("only publisher identity may anchor observations")
        canonical = self._url(url)
        if canonical[8:].split("/", 1)[0] != str(publisher["origin_host"]):
            raise gl.vm.UserError("snapshot origin does not match publisher identity")
        digest = str(content_digest).lower()
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise gl.vm.UserError("content digest must be sha256")
        now = _now()
        if int(observed_at) > now + 300 or int(observed_at) < now - 86400:
            raise gl.vm.UserError("observation timestamp outside anchoring window")
        if int(valid_for_seconds) < 300 or int(valid_for_seconds) > 86400:
            raise gl.vm.UserError("invalid observation validity")
        sequence = int(publisher.get("sequence", 0)) + 1
        publisher["sequence"] = sequence
        self.publishers[publisher_key] = json.dumps(publisher, sort_keys=True)
        frozen = {
            "snapshot_key": key,
            "publisher_key": publisher_key,
            "publisher_owner": publisher["owner"],
            "publisher_sequence": sequence,
            "url": canonical,
            "content_digest": digest,
            "observed_at": int(observed_at),
            "anchored_at": now,
            "valid_until": int(observed_at) + int(valid_for_seconds),
        }
        frozen["snapshot_digest"] = hashlib.sha256(json.dumps(frozen, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        self.snapshots[key] = json.dumps(frozen, sort_keys=True)
        self.snapshot_keys.append(key)
        return key

    @gl.public.view
    def get_publisher_json(self, publisher_key: str) -> str:
        return self.publishers.get(publisher_key, "")

    @gl.public.view
    def get_snapshot_json(self, snapshot_key: str) -> str:
        return self.snapshots.get(snapshot_key, "")

    @gl.public.view
    def list_snapshot_keys(self) -> list:
        return [self.snapshot_keys[i] for i in range(len(self.snapshot_keys))]
