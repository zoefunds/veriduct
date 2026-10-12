# VERIDUCT

**Independent evidence. Validator-settled covenants. One-shot bounded remedies.**

VERIDUCT is a GenLayer protocol for adjudicating reliability or safety covenants from independently operated public evidence sources. Its deployed demonstration uses exact records from the United States Geological Survey (USGS) and Euro-Mediterranean Seismological Centre (EMSC) for the M8.8 29 July 2025 Kamchatka earthquake. Validators independently retrieve both authority records, verify their frozen SHA-256 commitments, decide whether they materially describe the same threshold event, and may issue one narrowly bounded action against a deployed `ServiceControl` adapter.

- Application: [https://veri-duct.vercel.app](https://veri-duct.vercel.app)
- Network: GenLayer Studionet, chain ID `61999`
- Explorer: [https://explorer-studio.genlayer.com](https://explorer-studio.genlayer.com)
- Complete onchain proof: [E2E_RESULTS.md](./E2E_RESULTS.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Security model: [SECURITY.md](./SECURITY.md)
- Machine-readable deployment index: [deployment-manifest.public.json](./deployment-manifest.public.json)

## Deployed contracts

| Contract | Studionet address | Purpose |
|---|---|---|
| `PublisherLedger` | `0x808AB67377B2C6BD4952A3b0EB42fCB356bD71C1` | Protocol-curated authority registry and permissionless exact-byte evidence anchoring. |
| `CovenantBook` | `0x361a62D7edC2c8E92dBa3D81D074652d5E351eF1` | Immutable, delayed, versioned covenants with source-class and remedy bounds. |
| `Adjudicator` | `0xEFd6E0eAC443bfd33678E64124977Cc04609598F` | Permissionless case intake, validator retrieval, semantic comparison, and finality-gated issuance. |
| `MandateRouter` | `0xFeFBcD034a624C9f5aDFF4f85651E5dec65a1B82` | Exact-envelope verification, single dispatch, expiry, and receipt reconciliation. |
| `ServiceControl` | `0xb08e6dd9C756ecbbF07eE8254C60B5D7cFd43169` | Demonstration target with strict schemas and router-only authorization. |

The deployed source bytes for all five contracts match the repository files. Deployment transaction hashes and SHA-256 values are in the public manifest and are checked by `npm run verify:deployment`.

## Evidence and independence

The authority registry is protocol-level; a covenant owner chooses only from already registered sources. The demonstrated covenant requires two sources on distinct hosts and two authority classes:

| Source | Class | Host | Frozen record | SHA-256 |
|---|---|---|---|---|
| United States Geological Survey | `GOVERNMENT` | `earthquake.usgs.gov` | QuakeML origin for `us6000qw60` | `8e91ad76139bae8bd9efc3935760ef5493d8d6a02d0d1d1a4cda10bab56331b7` |
| Euro-Mediterranean Seismological Centre | `INTERGOVERNMENTAL` | `www.seismicportal.eu` | EMSC-RTS event `1838723` | `9558eae3d2ea9b891602f148c57a116d6ca1b2c7c7c033631330d229e019556b` |

USGS reported Mww 8.8 at `2025-07-29T23:24:52.483Z`, 52.4948/160.2395. EMSC reported Mw 8.8 at `2025-07-29T23:24:51.44Z`, 52.6050/160.0725. They are separately operated authority systems with different hosts and record formats.

The guarantee is deliberately precise: SHA-256 matching authenticates the exact bytes retrieved from the frozen authority URL. It does not independently certify the scientific accuracy of either catalog. Accuracy is supported by cross-authority agreement and remains the responsibility of the originating authorities.

## Neutral initiation and suppression resistance

The active covenant uses `PERMISSIONLESS` claim mode. Any wallet may open a conforming case, adjudicate it, execute an eligible mandate, and reconcile its receipt. The verified claimant/dispatcher was `0xF526ADbdEB5169e7CeA32c06EF69d7ce4a2D6276`; the service owner is a different address, `0x8D4E752AE688C21eC7C7D4d8a232B5e0700DBf0f`.

When a new covenant version is activated, the previous version remains claimable for seven days for observations made before supersession. This prevents an owner from publishing a replacement merely to suppress a valid existing event. `ALLOWLIST` mode is also supported for named counterparties when unrestricted initiation is inappropriate.

## Replay-safe enforcement

`execute_mandate` accepts only an unexpired `ISSUED` mandate. It atomically moves the record to `DISPATCHED`, fixes `dispatch_count` at one, and emits the target call only after finality. A second execution from `DISPATCHED`, `APPLIED`, `FAILED`, or `EXPIRED` rejects. Recovery is separate: it reads the target receipt and never sends the remedy again.

The mandate digest binds the target, action, intensity, canonical payload, payload-schema digest, case digest, covenant digest, verdict digest, requester, issue time, and expiry. `ServiceControl` independently checks router authorization, expiry, duplicate mandate keys, exact JSON keys and types, allowed queue values, address-shaped inputs where applicable, time bounds, and action/schema compatibility.

## Enforcement scope

The deployed consequence applies only to the onchain `ServiceControl` adapter. No external payments service, custody system, or production operator is connected. The adapter demonstrates enforceable authorization and lifecycle semantics without overstating operational scope.

## Tests

```bash
npm install
npm run check
npm run build
npm run verify:deployment
```

`npm run check` runs TypeScript checking, 42 Python tests, and GenLayer source parsing. Fifteen integration tests execute the actual five contract classes in one instrumented GenLayer runtime, including finality-gated child calls and authoritative receipt reads. Coverage includes permissionless claims, distinct authority classes and hosts, manipulated bytes, contradictions, malformed payloads, duplicate dispatch, expired/failed/dispatched/applied states, and receipt-only recovery.

`npm run verify:deployment` performs live Studionet checks: exact deployed source comparison, finalized transaction outcomes, live USGS/EMSC re-hashing, active covenant readback, independent claimant verification, validator verdict, one-shot applied mandate, target receipt, and manipulated-evidence denial. Use `npm run verify:deployment:report` to refresh `verification-report.json`.

## Frontend workflow

Every transaction form includes **Demo autofill** with complete real data. Evidence autofill calls the server-side authority proxy, fetches the live USGS or EMSC bytes, calculates their real SHA-256 digest, and fills the registered source, URL, observation time, validity, and snapshot key. Covenant, case, mandate, and reconciliation autofill values align with the deployed schemas and finalized records. Wallet approval is still required for every write.

The `/verification` page repeats the public read path in the browser: it refreshes both authority digests through `/api/evidence/authority`, reads latest-final covenant/case/mandate/target state, and links each result to the explorer.

## Deployment

`deploy/deployScript.ts` deploys the five contracts, registers USGS and EMSC authority scopes, binds the adjudicator, registers both target adapters, and writes `deployment-manifest.generated.json`. Production configuration fails explicitly if required addresses are absent. Wallet secrets are never stored in the repository or exposed through `NEXT_PUBLIC_*` variables.
