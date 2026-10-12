# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
import re
from datetime import datetime, timezone
from genlayer import *

SOURCE_CLASSES = ("GOVERNMENT", "INTERGOVERNMENTAL", "ACADEMIC", "INDEPENDENT_NETWORK")

def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())

class PublisherLedger(gl.Contract):
    curator: str
    sources: TreeMap[str, str]
    source_keys: DynArray[str]
    snapshots: TreeMap[str, str]
    snapshot_keys: DynArray[str]

    def __init__(self):
        self.curator = gl.message.sender_address.as_hex

    def _key(self, value: str) -> str:
        value = str(value).strip()
        if not re.fullmatch(r"[A-Za-z0-9._:-]{4,96}", value):
            raise gl.vm.UserError("invalid key")
        return value

    def _host(self, value: str) -> str:
        host = str(value).strip().lower()
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", host):
            raise gl.vm.UserError("invalid authority origin")
        return host

    def _url(self, value: str) -> tuple:
        value = str(value).strip()
        if not value.startswith("https://") or len(value) > 700 or any(ord(c) < 0x21 for c in value):
            raise gl.vm.UserError("snapshot URL must be canonical HTTPS")
        if any(token in value for token in ("@", "\\", "%", "#")):
            raise gl.vm.UserError("snapshot URL contains ambiguous syntax")
        remainder = value[8:]
        authority = re.split(r"[/ ?]", remainder, maxsplit=1)[0].lower()
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", authority):
            raise gl.vm.UserError("invalid snapshot hostname")
        path_and_query = remainder[len(authority):] or "/"
        path = path_and_query.split("?", 1)[0]
        if any(part in (".", "..") for part in path.split("/")):
            raise gl.vm.UserError("snapshot URL contains dot segment")
        return "https://" + authority + path_and_query, authority, path

    @gl.public.write
    def register_authority_source(self, source_key: str, name: str, origin_host: str, path_prefix: str, source_class: str, authority_uri: str) -> str:
        if gl.message.sender_address.as_hex != self.curator:
            raise gl.vm.UserError("only protocol curator may register an authority source")
        key = self._key(source_key)
        if key in self.sources:
            raise gl.vm.UserError("authority source already registered")
        label = str(name).strip()
        host = self._host(origin_host)
        prefix = str(path_prefix).strip()
        category = str(source_class).strip().upper()
        uri = str(authority_uri).strip()
        if len(label) < 5 or len(label) > 160:
            raise gl.vm.UserError("invalid authority name")
        if not prefix.startswith("/") or ".." in prefix or len(prefix) > 300:
            raise gl.vm.UserError("invalid authority path prefix")
        if category not in SOURCE_CLASSES:
            raise gl.vm.UserError("unsupported authority source class")
        if not uri.startswith("https://") or len(uri) > 500:
            raise gl.vm.UserError("authority provenance URI must be HTTPS")
        record = {"source_key": key, "name": label, "origin_host": host, "path_prefix": prefix, "source_class": category, "authority_uri": uri, "curator": self.curator, "registered_at": _now(), "active": True, "sequence": 0}
        self.sources[key] = json.dumps(record, sort_keys=True)
        self.source_keys.append(key)
        return key

    @gl.public.write
    def anchor_snapshot(self, snapshot_key: str, source_key: str, url: str, content_digest: str, observed_at: int, valid_for_seconds: int) -> str:
        key = self._key(snapshot_key)
        if key in self.snapshots:
            raise gl.vm.UserError("snapshot already exists")
        raw = self.sources.get(self._key(source_key), "")
        if not raw:
            raise gl.vm.UserError("authority source not found")
        source = json.loads(raw)
        if not source.get("active"):
            raise gl.vm.UserError("authority source is inactive")
        canonical, host, path = self._url(url)
        if host != source["origin_host"] or not path.startswith(source["path_prefix"]):
            raise gl.vm.UserError("snapshot URL is outside verified authority scope")
        digest = str(content_digest).lower()
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise gl.vm.UserError("content digest must be sha256")
        now = _now()
        if int(observed_at) > now + 300 or int(observed_at) < now - 315360000:
            raise gl.vm.UserError("observation timestamp outside anchoring window")
        if int(valid_for_seconds) < 300 or int(valid_for_seconds) > 2592000:
            raise gl.vm.UserError("invalid observation validity")
        sequence = int(source.get("sequence", 0)) + 1
        source["sequence"] = sequence
        self.sources[source_key] = json.dumps(source, sort_keys=True)
        frozen = {"snapshot_key": key, "source_key": source_key, "source_name": source["name"], "source_class": source["source_class"], "origin_host": source["origin_host"], "authority_uri": source["authority_uri"], "source_sequence": sequence, "submitter": gl.message.sender_address.as_hex, "url": canonical, "content_digest": digest, "observed_at": int(observed_at), "anchored_at": now, "valid_until": now + int(valid_for_seconds)}
        frozen["snapshot_digest"] = hashlib.sha256(json.dumps(frozen, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        self.snapshots[key] = json.dumps(frozen, sort_keys=True)
        self.snapshot_keys.append(key)
        return key

    @gl.public.view
    def get_source_json(self, source_key: str) -> str:
        return self.sources.get(source_key, "")

    @gl.public.view
    def list_source_keys(self) -> list:
        return [self.source_keys[i] for i in range(len(self.source_keys))]

    @gl.public.view
    def get_snapshot_json(self, snapshot_key: str) -> str:
        return self.snapshots.get(snapshot_key, "")

    @gl.public.view
    def list_snapshot_keys(self) -> list:
        return [self.snapshot_keys[i] for i in range(len(self.snapshot_keys))]
