# VERIDUCT security model

## Guarantees

1. Authority sources are admitted by protocol curation, not created by a covenant owner.
2. A covenant requires at least two registered sources on distinct hosts and at least two represented authority classes.
3. A snapshot is usable only inside its authority's HTTPS host/path scope and binds its exact URL, sequence, time window, and SHA-256 response digest.
4. Every validator independently retrieves the frozen URLs and rejects unavailable, oversized, non-2xx, or digest-mismatched bytes before semantic interpretation.
5. A breach needs material authority agreement on event identity, threshold, time, and location; a required-source contradiction cannot yield `BREACH_PROVEN`.
6. Claims can be permissionless or counterparty-allowlisted. The deployed policy is permissionless and was exercised by a wallet different from the owner.
7. A superseded policy remains claimable for seven days for qualifying earlier observations, preventing a governance replacement from suppressing an accrued claim.
8. Case, covenant, verdict, target, action, intensity, canonical payload, schema, requester, issue time, and expiry are digest-bound.
9. Only the finalized Adjudicator child transaction can issue a mandate; only the finalized Router child transaction can call the target.
10. Execution is allowed only from `ISSUED`, before expiry, and exactly once. Recovery reads the existing target receipt and never redispatches.
11. `ServiceControl` checks router authorization, expiry, duplicate mandate keys, exact schema keys/types/values, bounded time/amount-like inputs, and action compatibility.
12. Receipt reconciliation marks `APPLIED` only when the target returns the exact frozen action digest.

## Evidence claims

| Claim | Demonstrated | Boundary |
|---|---:|---|
| Retrieved bytes match frozen commitments | Yes | SHA-256 is recomputed by validators and the verifier. |
| Evidence origins are independently operated | Yes | USGS and EMSC operate different authority systems and hosts. |
| Authority records materially corroborate the event | Yes | Both report Mw/Mww 8.8, origin times ~1.04 seconds apart, and nearby Kamchatka coordinates. |
| VERIDUCT independently certifies scientific accuracy | No | Each authority remains responsible for measurement methodology and accuracy. |
| A non-owner can initiate and execute | Yes | Finalized flow uses claimant `0xF526…6276`, distinct from owner `0x8D4E…Bf0f`. |
| Enforcement controls an external service | No | It controls only the deployed `ServiceControl` adapter. |

## Payload validation

Validation runs both before a case is stored and immediately before dispatch. Unknown keys, missing keys, wrong primitive types, disallowed enum values, malformed JSON, excessive strings, expired timestamps, overlong durations, schema substitutions, action substitutions, target substitutions, and intensity changes reject before the destination call. The target repeats its own validation as defense in depth.

## Replay and expiry

The router never dispatches from `DISPATCHED`. `dispatch_count` is written once and cannot exceed one. `APPLIED`, `FAILED`, and `EXPIRED` are terminal. A duplicate execution is a contract error even when the original target application succeeded. An expired `ISSUED` mandate rejects before target emission; a delayed `DISPATCHED` mandate can only be reconciled to an existing receipt or closed without replay.

## Tested adversarial cases

The actual-contract integration suite and live Studionet proof cover:

- manipulated content digest and unavailable authority bytes;
- a semantic contradiction between otherwise authentic authorities;
- insufficient source/class/host independence;
- unauthorized direct adapter application;
- malformed, incomplete, extra-field, wrong-type, overlong, or modified payloads;
- target/action/intensity/schema/case/covenant envelope mutation;
- premature covenant activation;
- duplicate dispatch after `DISPATCHED` and `APPLIED`;
- execution after expiry;
- completed, failed, delayed, and receipt-recovery mandate states; and
- permissionless case creation and execution by an independent participant.

Expected failures count only when the transaction reaches finality and GenVM returns the intended contract error. Transaction hashes are listed in [E2E_RESULTS.md](./E2E_RESULTS.md).

## Residual trust

The authority curator can change which sources are available for future covenant versions, and service governance chooses a policy from the registered set. Existing snapshots, activated covenant versions, cases, verdicts, and mandates remain immutable. GenLayer validator consensus and availability of the authority endpoints remain dependencies. The protocol reduces evidence and enforcement discretion; it does not eliminate governance, scientific uncertainty, or network liveness risk.

## Secrets and reporting

The repository contains only public addresses and transaction identifiers. Never commit private keys, seed phrases, keystore passwords, or deployment tokens. The browser uses the user's EIP-1193 wallet; no backend signer exists. Security reports should include the affected method, invariant, finalized transaction or minimal test, and whether the issue concerns source authentication, semantic comparison, finality, routing, payload validation, or receipt reconciliation.
