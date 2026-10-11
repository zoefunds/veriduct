# VERIDUCT architecture

## Deployed topology

VERIDUCT separates five powers so no contract can create and exercise emergency authority alone.

```text
provider-operations (0x82dc…15d1) ─┐
                                     ├─ exact-byte snapshots ─┐
independent-observer (0x1add…84a0) ──┘                         │
                                                               v
Service governance ── immutable covenant ─────────────> Adjudicator
0x8d4e…bf0f                                           0xA508…430b
                                                               │ FINALIZED issue
                                                               v
                                                        MandateRouter
                                                        0x8f18…77F0
                                                               │ FINALIZED apply
                                                               v
                                                        ServiceControl
                                                        0x333B…Be3f
```

| Component | Finalized Studionet address |
|---|---|
| PublisherLedger | `0x5834e07BEd3Efa9038C66cb6dEBd1BAA5A702d43` |
| CovenantBook | `0x380a776a5895647b4D82103a47ba1d4E3e9d0338` |
| Adjudicator | `0xA50886124A3Ed027dc56dd37c0f658677320430b` |
| MandateRouter | `0x8f18685a77ED80BE9B8A18c484f8380a206A77F0` |
| ServiceControl | `0x333B99f2cd961C1B6C34EcEA88996D64f325Be3f` |

The router is permanently bound to the listed Adjudicator. `ENTER_READ_ONLY` and `RAISE_REVIEW_THRESHOLD` both route to the listed ServiceControl through schema-specific generic adapters.

## Publisher and snapshot model

A publisher record freezes:

```text
publisher_key, owner, display_name, origin_host, registered_at, sequence
```

The active demonstration identities are:

| Key | Onchain owner | Canonical host | Sequence |
|---|---|---|---:|
| `provider-operations` | `0x82dcDC5B028A13f3475DDeC31B5300acfe9815d1` | `veri-duct.vercel.app` | 2 |
| `independent-observer` | `0x1ADd10608F0c52EECa68Ba4e5795817828f184a0` | `veri-duct.vercel.app` | 2 |

The distinct owners are an onchain authorization property only. Both registered origins point to the same host, and both endpoint families are deterministic fixture generators in `lib/evidence.ts`. This deployment therefore makes no claim of independent monitoring infrastructure, separate operators, or independently acquired production telemetry.

A snapshot freezes `snapshot_key`, publisher key and owner, publisher sequence, exact HTTPS URL, observation time, validity limit, content SHA-256, anchor time, and a digest of the complete record. The Ledger validates canonical HTTPS construction and the registered hostname before storage.

During adjudication every validator retrieves the frozen URL. Deterministic contract code checks successful HTTP status, response size, and SHA-256 equality before any content reaches a model. The semantic prompt receives the frozen publisher owner, sequence, observation and expiry times, URL, snapshot digest, and authenticated content. This proves who anchored which bytes and that every validator interpreted those same bytes; it does not claim that a publisher is universally truthful.

## Covenant model

`CovenantBook` stores immutable versions under one service key. Only the original service owner can publish a higher version. Activation is delayed and monotonic. A policy freezes its approved publisher keys, minimum distinct-owner threshold, maximum observation age, evidence instructions, remedy policy, mandate TTL, action targets, action schemas, and intensity ceilings.

The active deployed demonstration covenant is version 4, key `payments-api-availability-v4`, digest `13ac39b7fc9c8d426d388dd780203158f2c428fbb936c2730e77ebf8bb3c5a05`. It requires two approved, separately owned publisher identities and limits observations to 60 minutes old. Read-only authority is capped at intensity 80; review-threshold authority is capped at 70; issued mandates expire after 30 minutes. The distinct-owner rule is an authorization and quorum property, not evidence that the two fixture measurements were independently collected.

## Case and semantic decision

Opening a case is deterministic. The Adjudicator verifies the caller is the covenant owner, loads the active immutable policy, checks the live adapter target and schema, confirms target governance, validates the intensity and JSON payload, rejects duplicate snapshot keys, enforces publisher-key and owner independence, and freezes the full source records into a case digest.

Adjudication then separates deterministic provenance from semantic judgment:

1. Each validator fetches every frozen URL independently.
2. Code recomputes exact-byte SHA-256 and marks unavailable data without model discretion.
3. The model must return one of `BREACH_PROVEN`, `NO_BREACH`, `INSUFFICIENT_CORROBORATION`, `CONFLICTING_OBSERVATIONS`, or `REMEDY_DISPROPORTIONATE`.
4. It must also return exactly one state for every frozen snapshot: `SUPPORTS_BREACH`, `CONTRADICTS_BREACH`, `NEUTRAL`, or `UNAVAILABLE`.
5. Validators independently repeat the evaluation, require the same decision and per-snapshot states, and separately compare clauses, findings, proportionality, and contradictions for material equivalence.
6. Contract code downgrades `BREACH_PROVEN` if authenticated supporting sources do not meet the covenant threshold.

The verified demonstration case froze two exact-byte fixture sources, received `SUPPORTS_BREACH` for both, and finalized `BREACH_PROVEN` with verdict digest `188f24a7436da44489d7efdc690f18826aa31a230b454ac543a0a35732432dec`.

## Generic action adapters

The router contains no service-specific method name and no hard-coded action class. Governance registers an action ID, target, and payload-schema digest. Registration succeeds only when the target returns the same governance address and attests support for the exact action/schema pair. Every compatible target implements:

```text
apply_mandate(action_id, intensity, payload_json, mandate_key, action_digest, holder)
```

`ServiceControl` interprets two schemas:

- `ENTER_READ_ONLY` uses canonical JSON `{"reason":"string","until":"unix"}` and schema digest `22b8255d4abed99e0afc2c27881e3a8999f02e192440aefda5f70d736d26b950`.
- `RAISE_REVIEW_THRESHOLD` uses canonical JSON `{"queue":"string","reason":"string"}` and schema digest `63a29967edc6ce09e0e136a79b2af5842e8398699aefaac1fb132931bfa4a22d`.

Service-specific validation stays inside the adapter. A new target or action can be registered without changing MandateRouter.

## Authority envelope

The mandate records the case, holder, target, action, intensity, canonical payload, schema digest, covenant digest, verdict digest, issue time, expiry, status, dispatch count, and the exact action digest. That digest covers case, covenant, target, action, intensity, canonical payload, and schema. Execution rebuilds it using caller-supplied target, action, intensity, and payload plus the frozen case, covenant, and schema; holder, expiry, status, and live adapter route are checked separately. Any material mutation rejects before dispatch.

## Finality state machine

```text
Case:     OPEN ── adjudicate ──> CLOSED_NO_MANDATE
                         └──────> MANDATE_PENDING_FINALITY

Mandate:                         ISSUED
                                   │ exact dispatch
                                   v
                                DISPATCHED
                                   │ target digest observed
                                   v
                                 APPLIED
```

`ACCEPTED` never grants authority. A proven parent emits issuance with `on="finalized"`; an exact dispatch emits target application with `on="finalized"`. Reconciliation reads `get_applied_mandate_digest` from the target and marks `APPLIED` only when it equals the frozen action digest.

## Demonstration application boundary

The Next.js application contains static interface routes plus dynamic demonstration-evidence Route Handlers. It has no signing key, database, or private indexer. Wallets sign writes directly; `genlayer-js` reads finalized state directly from Studionet. The browser uses local storage only to carry submitted workflow keys and exact payload values between forms. That browser state never grants authority: every later step must load and validate the corresponding finalized onchain record.

Authentication and accuracy are deliberately separated. PublisherLedger and Adjudicator can establish the publisher wallet, canonical URL, observation timestamps, HTTP success, and equality between fetched bytes and the committed SHA-256 digest. They cannot establish that a number inside those authenticated bytes was measured correctly. Independent measurement requires separately operated collection infrastructure and documentary or cryptographic provenance outside the guarantees demonstrated here.

ServiceControl is the complete enforcement boundary in this deployment. `ENTER_READ_ONLY` blocks only `submit_operation` calls made to that contract while its bounded interval is active. No external payments API, bank, processor, or offchain service is controlled by this adapter.

## Failure behavior

- Fetch failure, non-2xx response, oversized body, or digest mismatch: snapshot becomes unavailable.
- Fewer authenticated, distinct-owner supporting sources than required: insufficient corroboration.
- Material source disagreement: conflicting observations.
- Non-owner policy or case action: deterministic rejection.
- Remedy beyond policy or adapter bounds: deterministic rejection.
- Live adapter target or schema differs from the frozen covenant: case opening or execution rejects.
- Parent transaction not finalized: no child authority or consequence exists.
- Child application failure: mandate stays `DISPATCHED`; exact retry or reconciliation remains possible without changing its bindings.
- Duplicate identical delivery: target returns idempotently.
- Reuse of a mandate key with another digest: target rejects conflicting replay.
