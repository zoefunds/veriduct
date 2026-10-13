# VERIDUCT architecture

This document describes the contracts deployed at the addresses in `deployment-manifest.public.json`. It was checked against the deployed source commitments, authoritative state, and 44-test repository baseline on 13 October 2026.

## Trust-separated flow

```text
USGS (government) ─┐
                   ├─ exact-byte evidence ─> PublisherLedger
EMSC (intergov.) ──┘                              │ frozen snapshots
                                                  v
any claimant ─> CovenantBook policy ────────> Adjudicator
                                                  │ on FINALIZED: issue
                                                  v
                                            MandateRouter
                                                  │ on FINALIZED: apply once
                                                  v
                                            ServiceControl
                                                  │ exact digest receipt
                                                  └─> reconcile only
```

The protocol separates authority-source curation, policy authorship, claim initiation, semantic adjudication, capability routing, and consequence application. The service owner cannot register arbitrary sources, is not required to initiate or execute a valid claim, and cannot erase a superseded covenant's seven-day claim window for earlier observations.

## 1. PublisherLedger

The protocol curator registers an authority with `source_key`, name, class, canonical HTTPS host, allowed path prefix, and provenance URI. Supported classes are `GOVERNMENT`, `INTERGOVERNMENTAL`, `ACADEMIC`, and `INDEPENDENT_NETWORK`. Host and path rules prevent a snapshot from substituting an unrelated endpoint.

Anyone may anchor a snapshot from a registered scope. A snapshot freezes source identity/class/host, exact URL including query, observation time, validity limit, sequence, submitter, content SHA-256, anchor time, and a digest of the complete record. The submitter does not become the authority: authenticity derives from the registered origin plus exact bytes, not a self-asserted publisher wallet.

## 2. CovenantBook

A covenant freezes the service owner, detailed evidence and remedy policies, authority source keys, required source classes, distinct hosts, minimum corroboration, claim mode, named claimants, action target/schema/intensity ceilings, maximum observation age, mandate TTL, and activation delay. Publication verifies every source against the global registry and requires at least two distinct authority classes and hosts.

Versions are immutable and monotonic. Activation is delayed. Replacing an active version records `superseded_at` and keeps the earlier covenant claimable for seven days; the Adjudicator also requires the frozen observations to predate supersession. This gives governance a legitimate upgrade mechanism without a unilateral retroactive veto.

Claim modes:

- `PERMISSIONLESS`: any address may open the assessment and later execute an issued mandate.
- `ALLOWLIST`: owner plus named counterparties may open cases; execution remains permissionless once validators issue authority.

## 3. Adjudicator

Case opening is deterministic. It verifies claim authorization, claimable covenant version, source membership, required authority classes, distinct hosts, snapshot validity/age, action bounds, target governance, action/schema support, payload canonicalization, and target-side schema validation. It freezes all source records and the canonical payload in a case digest.

During adjudication each validator independently fetches every exact URL. Contract code checks HTTP success, size, and SHA-256 equality before exposing content to semantic evaluation. The structured verdict must classify every source as `SUPPORTS_BREACH`, `CONTRADICTS_BREACH`, `NEUTRAL`, or `UNAVAILABLE`, and return one of five decisions. `BREACH_PROVEN` requires enough authenticated supporting authorities and no required-source contradiction. Validators repeat the retrieval and evaluation, compare the decision and per-source states exactly, and semantically compare findings and proportionality.

Only a finalized `BREACH_PROVEN` parent emits `issue_mandate`; no optimistic/accepted state grants authority.

## 4. MandateRouter

The router is target-neutral. Governance registers `(action_id, target, payload_schema_digest)` only when the target independently attests the same governance and schema. Issuance accepts calls only from the permanently bound Adjudicator.

The mandate action digest binds every security-relevant field. Execution requires:

- status exactly `ISSUED`;
- current time not beyond `expires_at`;
- current adapter route still equal to the frozen target/schema;
- recomputed envelope digest equal to the frozen digest; and
- target-side payload validation still true.

Execution records `DISPATCHED` and `dispatch_count = 1` before emitting the finality-gated target call. No path executes from `DISPATCHED`. `recover_dispatch` delegates only to receipt reconciliation; it never emits another target call. Reconciliation reads `get_applied_mandate_digest`: matching receipt becomes `APPLIED`, a terminal target result may become `FAILED`, and a dispatched record with no receipt after expiry becomes `EXPIRED`.

## 5. ServiceControl

The target accepts `apply_mandate` only from the bound router and rejects expired or previously applied mandate keys. It recomputes schema-specific constraints before changing state.

- `ENTER_READ_ONLY` requires exactly `{reason, until}`; `reason` is a bounded nonempty string; `until` is an integer in the future and no more than two hours ahead.
- `RAISE_REVIEW_THRESHOLD` requires exactly `{queue, reason}`; `queue` is one of `all`, `payments`, or `withdrawals`; both fields have bounded string lengths.

The target stores the exact action digest as its authoritative receipt. This deployment controls only the `ServiceControl` contract's own operations.

## State machines

```text
Case: OPEN ── adjudicate ──> CLOSED_NO_MANDATE
          └─ BREACH_PROVEN ─> MANDATE_PENDING_FINALITY

Mandate: ISSUED ── execute once ─> DISPATCHED ── receipt match ─> APPLIED
             │                         ├─ terminal failure ────> FAILED
             └─ expired: reject        └─ no receipt + expiry ─> EXPIRED
```

`APPLIED`, `FAILED`, and `EXPIRED` are terminal. Retry means checking an existing receipt, never applying the consequence twice.

### Recovery verification

The integration suite imports and executes the repository's actual `MandateRouter` and `ServiceControl` classes. A controlled finalized-child delivery boundary reproduces states that a correct live target does not naturally produce:

- matching receipt: `DISPATCHED → APPLIED` with `RECEIPT_CONFIRMED`;
- no receipt before expiry: remains `DISPATCHED` with `FINALITY_PENDING`;
- no receipt after expiry: `DISPATCHED → EXPIRED` with `NO_RECEIPT_BEFORE_EXPIRY`; and
- nonempty mismatched receipt: `DISPATCHED → FAILED` with `CONFLICTING_RECEIPT`.

Every branch asserts `dispatch_count = 1`. Recovery never emits `apply_mandate`, and execution from a terminal state rejects. The complete executable matrix is in [TESTING.md](./TESTING.md) and the reviewer-specific explanation is in [review2.md](./review2.md).

## Deployed proof

The independent claimant `0xF526…6276` opened and dispatched the successful case; governance is `0x8D4E…Bf0f`. Validators matched both authority digests and agreed on the M8.8 event within approximately 1.04 seconds and nearby epicenters. The mandate reached `APPLIED` with `dispatch_count = 1`. Separate finalized transactions reject duplicate dispatch, direct target calls, malformed payloads, manipulated authority bytes, and expired execution. Full hashes and readbacks are in [E2E_RESULTS.md](./E2E_RESULTS.md).

The active covenant is version 2. The successful applied mandate belongs to immutable version 1; version 2 supplies the five-minute TTL used by the finalized expiry rejection. Both versions remain visible because contract history is append-only.
