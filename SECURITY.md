# VERIDUCT security policy

## Scope

This policy covers the five GenLayer contracts, the Next.js interface, the two deterministic evidence Route Handler families, deployment configuration, and the boundary between finalized onchain state and browser workflow state. The deployed Studionet contracts and transaction proofs are listed in [deployment-manifest.public.json](./deployment-manifest.public.json).

## Enforced invariants

1. Only the wallet registered as a publisher owner can anchor under that publisher key.
2. Every snapshot URL must be HTTPS and resolve to the publisher's exact registered hostname.
3. Snapshot keys are immutable; publisher sequence is monotonic and frozen into each snapshot.
4. Only fresh, successful, size-bounded response bytes whose SHA-256 equals the anchor can enter semantic adjudication as authentic.
5. A case cannot repeat a snapshot key, publisher key, or publisher owner to manufacture quorum.
6. Only the active immutable covenant version applies, and the case freezes its covenant digest.
7. Only the service owner can publish covenant versions, activate them, or open a covenant case.
8. Covenant ownership must equal target governance before a case can freeze an action.
9. The live router adapter must match the covenant's target and payload-schema digest.
10. A semantic leader result is accepted only when validators independently reach the same decision and per-snapshot states and confirm material equivalence.
11. Only `BREACH_PROVEN` emits mandate issuance, and the issuance child runs only after the parent finalizes.
12. Holder, target, action, intensity, canonical payload, schema, covenant, verdict, case, issue time, expiry, and TTL are frozen into the mandate record. Target, action, intensity, canonical payload, schema, covenant, and case participate in the action digest; holder and expiry are checked separately.
13. Only the recorded holder can dispatch or reconcile. Initial dispatch requires an unexpired `ISSUED` mandate; an already `DISPATCHED` mandate may be exactly retried or reconciled without changing its frozen envelope.
14. Dispatch reaches the target only through a finalized child transaction.
15. Only MandateRouter can call the target adapter, and the target independently checks that the mandate holder equals service governance.
16. Reconciliation marks `APPLIED` only after the target returns the exact frozen action digest.
17. An applied key is idempotent only for the same digest and rejects conflicting reuse.

## Trust and threat model

VERIDUCT proves authenticated bytes and policy-relative validator agreement, not universal factual truth. The deployed fixtures have distinct onchain owners but a single application operator, host, codebase, and data generator. Consequently, this deployment provides publisher-identity independence only; it does not provide measurement, infrastructure, operator, or hosting independence. Service governance chooses publisher identities and the policy itself. Risk is bounded by immutable source anchors, distinct onchain owners, a precommitted quorum, delayed policy activation, explicit freshness limits, independent validator retrieval, exact-byte hashing, strict semantic response shape, validator comparison, bounded adapters, expiry, finality, and replay protection.

The deployed ServiceControl target is a demonstration adapter that changes its own onchain operational controls only. It is not connected to an externally operated payments API, does not custody user funds, and does not perform asynchronous token transfers. Its two actions are bounded read-only mode and a numeric review threshold. The verified read-only interval ended at 17:28:06 WAT on 11 October 2026. A fresh `LATEST_FINAL` read at 18:56 WAT confirmed that the adapter is open, one mandate is recorded as applied, and operation count remains zero.

## Evidence claim matrix

| Property | Demonstrated? | Proof / limitation |
|---|---:|---|
| Exact response bytes match the onchain SHA-256 commitment | Yes | Validator retrieval and the reproducible verifier hash the raw body. |
| Snapshot was anchored by the registered publisher wallet | Yes | PublisherLedger enforces sender ownership and freezes the owner in the record. |
| Two publisher records have different wallet owners | Yes | Finalized registry state contains two distinct addresses. |
| Measurements came from independent systems or operators | No | Both fixture routes run in the same Vercel deployment and source tree. |
| Fixture values describe a real payments service | No | Values are deterministic synthetic demonstration data. |
| Validators independently retrieve and interpret committed bytes | Yes | Finalized adjudication transaction and verdict record. |
| Read-only affects an external payments service | No | Enforcement ends at the deployed ServiceControl adapter. |

## Verified deployed regressions

| Attack or failure | Finalized result | Transaction |
|---|---|---|
| Provider wallet publishes a covenant version | Rejected: `only service owner may publish versions` | [`0xf8bd3567d5be4199e52fc8b1be9bec525621f6d700641cfcb0a4f7454e134901`](https://explorer-studio.genlayer.com/tx/0xf8bd3567d5be4199e52fc8b1be9bec525621f6d700641cfcb0a4f7454e134901) |
| Provider wallet opens an owner-only case | Rejected: `only service owner may open a covenant case` | [`0x1ec8111ec0a6c1a08260a94b89c328b177d5f90a57cf458150c0608e2e19da60`](https://explorer-studio.genlayer.com/tx/0x1ec8111ec0a6c1a08260a94b89c328b177d5f90a57cf458150c0608e2e19da60) |
| Authorized mandate intensity changes from 60 to 61 | Rejected: `mandate envelope digest mismatch` | [`0x47a453f75f42616a97149d63ecd09f885620ac0b61145280abf231fb3ef0a3ae`](https://explorer-studio.genlayer.com/tx/0x47a453f75f42616a97149d63ecd09f885620ac0b61145280abf231fb3ef0a3ae) |
| Governance bypasses the router and calls the adapter | Rejected: `only MandateRouter may apply remedies` | [`0xa5a827bdadf7b3eed1ea93eeeb678043130c2e4cfa26c0fa4d6bb4dd169863cd`](https://explorer-studio.genlayer.com/tx/0xa5a827bdadf7b3eed1ea93eeeb678043130c2e4cfa26c0fa4d6bb4dd169863cd) |
| Risk-92 settlement runs during authorized read-only mode | Rejected: `service is in covenant-enforced read-only mode` | [`0xf2b2807c13ed374365262f3ef08304bced74ecb4a94505d60b7bc06eb9c69593`](https://explorer-studio.genlayer.com/tx/0xf2b2807c13ed374365262f3ef08304bced74ecb4a94505d60b7bc06eb9c69593) |

The complete 18-check deployed demonstration sequence, including successful paths and exact inputs, is in [E2E_RESULTS.md](./E2E_RESULTS.md). Local model tests additionally cover forged publisher ownership, hostname substitution, stale sources, fake quorum, target seizure, all material envelope mutations, non-proven issuance, and replay.

## Secret handling

The repository contains only public contract addresses and public transaction hashes. Wallet private keys, seed phrases, keystore passwords, and deployment credentials must never be committed, placed in `NEXT_PUBLIC_*` variables, pasted into issues, or sent with vulnerability reports. The deployed interface requires an EIP-1193 wallet and never asks a backend to sign on the user's behalf.

## Responsible testing and reporting

Do not send unapproved transactions to deployments you do not control. For a report, include the affected contract and method, preconditions, expected invariant, observed finalized behavior, transaction hash or minimal local reproduction, and whether the issue concerns deterministic checks, validator comparison, finality, routing, or target enforcement. Do not include private keys, seed phrases, passwords, or unrelated personal data.
