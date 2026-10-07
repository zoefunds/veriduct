# Security policy

## Invariants

1. Only a registered publisher wallet can anchor under its identity.
2. Publisher URLs must use the identity’s exact canonical origin.
3. Only fresh, successful, byte-identical snapshots can support a breach.
4. One publisher identity counts at most once per case.
5. Only the active immutable covenant applies, and a case freezes its digest.
6. Covenant ownership must match target governance.
7. Only a materially equivalent validator result can reach consensus.
8. Only `BREACH_PROVEN` emits mandate issuance, and only on finality.
9. The router action registry must match covenant target and schema.
10. Every material action field participates in the execution digest.
11. Only the holder can dispatch or reconcile.
12. Only the router can call the adapter, and the adapter rechecks governance.
13. Applied mandate keys cannot be replayed with the same or a different envelope.

## Deliberate limits

VERIDUCT proves authenticated provenance and policy-relative adjudication, not objective universal truth. Publisher selection remains governance. The distinct-publisher quorum, immutable source anchors, activation delay, freshness windows, and fail-closed comparison make that trust explicit and bounded.

The demonstration target changes non-custodial operational state. It does not hold user funds or emit asynchronous value transfers.

## Reporting

When reporting an issue, include the contract, method, preconditions, expected invariant, observed behavior, and a minimal reproduction. Never test against a production deployment without authorization.
