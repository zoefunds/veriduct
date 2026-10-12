# VERIDUCT acceptance-response review

## Purpose

This document records the implementation, deployment, testing, and documentation work completed in response to the additional acceptance requirements. It is intended to let a reviewer reproduce every material claim without relying on screenshots, private infrastructure, or an unverifiable narrative.

The corrected system is deployed on GenLayer Studionet (`chainId 61999`) and exposed through [https://veri-duct.vercel.app](https://veri-duct.vercel.app). The public browser verifier is [https://veri-duct.vercel.app/verification](https://veri-duct.vercel.app/verification).

## Final deployed contracts

| Contract | Address | Responsibility |
|---|---|---|
| `PublisherLedger` | `0x808AB67377B2C6BD4952A3b0EB42fCB356bD71C1` | Protocol-curated authority scopes and immutable exact-byte evidence anchors. |
| `CovenantBook` | `0x361a62D7edC2c8E92dBa3D81D074652d5E351eF1` | Immutable, delayed and monotonically versioned policies, claim authorization and remedy bounds. |
| `Adjudicator` | `0xEFd6E0eAC443bfd33678E64124977Cc04609598F` | Case freezing, validator retrieval, exact-byte verification, semantic comparison and finality-gated issuance. |
| `MandateRouter` | `0xFeFBcD034a624C9f5aDFF4f85651E5dec65a1B82` | Exact-envelope verification, one-shot dispatch, expiry and receipt-only recovery. |
| `ServiceControl` | `0xb08e6dd9C756ecbbF07eE8254C60B5D7cFd43169` | Strict target-side schema, authorization, expiry and replay enforcement. |

Deployment transaction hashes and deployed-source SHA-256 commitments are recorded in `deployment-manifest.public.json`. The reproducible verifier downloads each deployment transaction, decodes its contract source bytes, and compares those bytes directly with the corresponding repository file.

---

## 1. Independent evidence verification

### Acceptance concern

The earlier model allowed the covenant owner to select publisher identities while both bundled streams were served by the same application host. Separate wallet addresses established different onchain identities, but they did not prove separate monitoring systems, independent operators, or independently acquired measurements.

### Implemented correction

The evidence model was replaced with a protocol-curated authority registry. `PublisherLedger.register_authority_source()` now records:

- a stable authority source key;
- the authority's public name;
- a canonical HTTPS hostname;
- an allowed path prefix;
- an authority class;
- a public provenance URI;
- curator identity and registration time; and
- active state and monotonic source sequence.

Supported authority classes are `GOVERNMENT`, `INTERGOVERNMENTAL`, `ACADEMIC`, and `INDEPENDENT_NETWORK`. A covenant owner cannot create a private source identity inside a covenant. It can only reference sources that already exist in this protocol-level registry.

Snapshot submission is permissionless. The submitter does not become the measurement authority. An anchor freezes the registered authority identity, class and host, the exact HTTPS URL including query string, the observation time, validity limit, source sequence, submitter, SHA-256 content digest, anchor time, and digest of the full snapshot record.

The deployed demonstration uses two separately operated authoritative systems:

| Authority | Class | Host | Record |
|---|---|---|---|
| United States Geological Survey | `GOVERNMENT` | `earthquake.usgs.gov` | QuakeML origin product for event `us6000qw60` |
| Euro-Mediterranean Seismological Centre | `INTERGOVERNMENTAL` | `www.seismicportal.eu` | EMSC-RTS event record with source ID `1838723` |

The USGS exact-byte digest is `8e91ad76139bae8bd9efc3935760ef5493d8d6a02d0d1d1a4cda10bab56331b7`. The EMSC exact-byte digest is `9558eae3d2ea9b891602f148c57a116d6ca1b2c7c7c033631330d229e019556b`.

USGS reports Mww 8.8 at `2025-07-29T23:24:52.483Z`, latitude 52.4948 and longitude 160.2395. EMSC reports Mw 8.8 at `2025-07-29T23:24:51.44Z`, latitude 52.6050 and longitude 160.0725. The records therefore come from different operators, authority classes, hosts, APIs and formats while materially corroborating the same event.

### Validator verification

During adjudication every validator independently retrieves every frozen URL. Deterministic contract code checks:

- HTTP success;
- maximum response size;
- exact SHA-256 equality with the anchor;
- registered host and path scope;
- snapshot validity and observation age;
- distinct authority hosts;
- represented authority classes; and
- covenant membership.

Only authenticated bytes are exposed to semantic evaluation. The structured verdict must assign each source one state: `SUPPORTS_BREACH`, `CONTRADICTS_BREACH`, `NEUTRAL`, or `UNAVAILABLE`. Validators independently reproduce the evaluation and must agree on both the decision and every per-source state. They separately compare findings, covenant clauses, contradictions and proportionality for material equivalence.

Contract code prevents `BREACH_PROVEN` if supporting authenticated sources are below the covenant threshold or any required source contradicts the claim.

### Manipulated-evidence proof

A syntactically valid snapshot was anchored with a false USGS digest. Validator retrieval computed a different digest, marked that observation unavailable and finalized `INSUFFICIENT_CORROBORATION`. The case reached `CLOSED_NO_MANDATE`; its mandate key remained empty.

- Manipulated anchor: [`0xe5c2a1356a1f710da9f3af1b26940fce717f7754364cf0f96db1b9c9805cb4e0`](https://explorer-studio.genlayer.com/tx/0xe5c2a1356a1f710da9f3af1b26940fce717f7754364cf0f96db1b9c9805cb4e0)
- Manipulated case: [`0x78e5b6aba5262ccbf41d8ac623100d0a808bbb8a018d4de050c7329c23373665`](https://explorer-studio.genlayer.com/tx/0x78e5b6aba5262ccbf41d8ac623100d0a808bbb8a018d4de050c7329c23373665)
- Finalized denial: [`0x4fc1dffda9c0a5aa5c41637665388d08378b3b9f0aafb8c1d4513550b6b3c8a7`](https://explorer-studio.genlayer.com/tx/0x4fc1dffda9c0a5aa5c41637665388d08378b3b9f0aafb8c1d4513550b6b3c8a7)

### Accuracy boundary

The documentation now states the precise guarantee. SHA-256 matching proves which exact bytes were retrieved from a registered authority URL. It does not independently certify the scientific accuracy of either authority. Measurement credibility comes from the originating authorities and material cross-authority agreement, not from VERIDUCT claiming to operate either measurement system.

---

## 2. Neutral enforcement and authorization

### Acceptance concern

The earlier workflow depended on the covenant owner for source selection, case creation and remedy execution. The same party could control the entire path or decline to initiate an otherwise valid breach claim.

### Implemented correction

`CovenantBook` now supports two explicit claim modes:

- `PERMISSIONLESS`: any address may open a conforming case.
- `ALLOWLIST`: the owner and named counterparties may open cases.

The active deployed covenant uses `PERMISSIONLESS`. Case opening preserves the real requester independently from the service owner. Adjudication is callable by an independent participant. Once validators issue a mandate, execution and receipt reconciliation are also permissionless; neither operation requires the covenant owner.

The demonstrated claimant and dispatcher are `0xF526ADbdEB5169e7CeA32c06EF69d7ce4a2D6276`. Service governance is the different address `0x8D4E752AE688C21eC7C7D4d8a232B5e0700DBf0f`.

### Suppression resistance

When governance activates a newer covenant version, the previous version is not immediately made unusable. It records `superseded_at` and remains claimable for seven days. The Adjudicator requires relevant observations to predate supersession. This prevents an owner from publishing a replacement solely to erase an already accrued claim while preserving orderly future policy upgrades.

### Deployed proof

- Independent case creation: [`0x69718a54228943af28a459e6cfb35d24c4ffc083309ccad112d7a9367b76a922`](https://explorer-studio.genlayer.com/tx/0x69718a54228943af28a459e6cfb35d24c4ffc083309ccad112d7a9367b76a922)
- Independent adjudication: [`0x5b626535efaff29218516c04114622f8f5794c4d82e920215ac948f854fd8105`](https://explorer-studio.genlayer.com/tx/0x5b626535efaff29218516c04114622f8f5794c4d82e920215ac948f854fd8105)
- Permissionless mandate execution: [`0x6f48e98145121d5a7a43713a217438bf57ae4eb825a6e0acf46b17cfaab61d2f`](https://explorer-studio.genlayer.com/tx/0x6f48e98145121d5a7a43713a217438bf57ae4eb825a6e0acf46b17cfaab61d2f)
- Receipt reconciliation: [`0xa0597167c431e2535d2f6740ae396be3f0d16ddd55b47cc3132c12564d8f7b47`](https://explorer-studio.genlayer.com/tx/0xa0597167c431e2535d2f6740ae396be3f0d16ddd55b47cc3132c12564d8f7b47)

---

## 3. Prevention of repeated remedy execution

### Acceptance concern

The earlier `execute_mandate()` path allowed a second dispatch while a mandate was already `DISPATCHED`. Treating redispatch as a retry risked applying a consequence more than once.

### Implemented correction

`MandateRouter.execute_mandate()` now requires status exactly `ISSUED`. Every other lifecycle state rejects before any target call:

- `DISPATCHED`;
- `APPLIED`;
- `FAILED`; and
- `EXPIRED`.

On the only permitted execution path, the Router:

1. checks expiry;
2. canonicalizes the payload;
3. recomputes the complete action digest;
4. verifies the live adapter route and target schema;
5. writes status `DISPATCHED`;
6. fixes `dispatch_count` to one;
7. records the dispatcher and dispatch time; and
8. emits the target application only on parent finality.

There is no redispatch path from `DISPATCHED`.

### Recovery mechanism

`recover_dispatch()` is separate from execution and delegates only to receipt reconciliation. It reads `get_applied_mandate_digest()` from the frozen target:

- an exact digest becomes `APPLIED`;
- a conflicting receipt becomes `FAILED`;
- no receipt after expiry becomes `EXPIRED`; and
- no receipt before expiry remains `DISPATCHED`.

Recovery never emits another target transaction and never increments the dispatch count.

### Defense in depth

`ServiceControl` rejects any mandate key already present in `applied_mandates`, even if a router defect or external caller attempted to deliver it again.

### Deployed proof

The successful mandate reached `APPLIED` with `dispatch_count = 1`. A second execution finalized with a contract error:

- Duplicate dispatch rejection: [`0x95ce0605c5dc3693d412d49c589e8ba77e9f4abb97090233d08030fdc4c8ac80`](https://explorer-studio.genlayer.com/tx/0x95ce0605c5dc3693d412d49c589e8ba77e9f4abb97090233d08030fdc4c8ac80)

---

## 4. Consistent mandate expiration

### Acceptance concern

Expiry was not enforced consistently across repeated dispatch attempts and later lifecycle paths.

### Implemented correction

Expiry is now enforced at multiple layers:

- `MandateRouter.execute_mandate()` rejects an expired `ISSUED` mandate before target emission.
- Every non-`ISSUED` state rejects before reaching the expiry-independent envelope path.
- The finality child includes the frozen expiry.
- `ServiceControl.apply_mandate()` independently rejects when the child arrives after expiry.
- Reconciliation converts a dispatched mandate without a receipt after expiry to `EXPIRED` rather than redispatching it.

### Test coverage

The actual-contract integration suite explicitly covers:

- expired but previously unexecuted `ISSUED` mandates;
- `DISPATCHED` mandates;
- completed `APPLIED` mandates;
- `FAILED` mandates;
- `EXPIRED` mandates; and
- delayed dispatch recovery with and without a target receipt.

### Deployed expiry proof

A second covenant version used a five-minute mandate TTL. An independent participant opened and adjudicated a valid case. After the mandate expired, its complete correct envelope was submitted. Validators finalized the expected error and no target child was emitted.

- Short-TTL covenant publication: [`0x6d778f2675756beaf7ee5e68e190630111f4b85e501d8e0d266801c0352c1851`](https://explorer-studio.genlayer.com/tx/0x6d778f2675756beaf7ee5e68e190630111f4b85e501d8e0d266801c0352c1851)
- Activation: [`0x7317ba9e0f9e2118e86ef7ce514f054f85b43fe56efb2a3f5b8bef5037b205d1`](https://explorer-studio.genlayer.com/tx/0x7317ba9e0f9e2118e86ef7ce514f054f85b43fe56efb2a3f5b8bef5037b205d1)
- Independent expiry case: [`0x86f3d6b925e4876d134b052d294c95775ee74626cb7848bcdcdebf337303e22b`](https://explorer-studio.genlayer.com/tx/0x86f3d6b925e4876d134b052d294c95775ee74626cb7848bcdcdebf337303e22b)
- Validator adjudication: [`0xe8c0693eca2d32bc5a82e14bb9525f1ade26987f7f4bd9c714be3760eab88b59`](https://explorer-studio.genlayer.com/tx/0xe8c0693eca2d32bc5a82e14bb9525f1ade26987f7f4bd9c714be3760eab88b59)
- Expired execution rejection: [`0x78b54440080e30c0abf18d35889b9e8d5afb52a832d65de0569639cd7f1c8272`](https://explorer-studio.genlayer.com/tx/0x78b54440080e30c0abf18d35889b9e8d5afb52a832d65de0569639cd7f1c8272)

---

## 5. Complete payload validation

### Acceptance concern

Remedy payloads needed complete validation of required fields, types, allowed values, addresses and amounts where applicable, covenant consistency, and modification resistance.

### Implemented correction

Payload validation now occurs at three stages:

1. The Adjudicator calls the target's `validate_payload()` before storing a case.
2. The Router calls `validate_payload()` again immediately before dispatch.
3. `ServiceControl.apply_mandate()` repeats validation before changing target state.

The deployed actions use exact schemas:

#### `ENTER_READ_ONLY`

The payload must contain exactly:

```json
{"reason":"nonempty bounded string","until":1234567890}
```

`until` must be a true integer, not a Boolean or string, must be in the future, and must be no more than two hours ahead. Unknown or missing fields reject.

#### `RAISE_REVIEW_THRESHOLD`

The payload must contain exactly:

```json
{"queue":"all|payments|withdrawals","reason":"nonempty bounded string"}
```

The queue is a strict enum and both strings have bounds.

The deployed actions do not transfer funds and therefore contain no recipient or amount field. Address and amount validation are consequently not applicable to these schemas. All addresses that do exist in the authority envelope—target, router, governance and requester—are parsed as GenLayer addresses and checked against frozen records.

The action digest binds:

- case key and covenant digest;
- target address;
- action identifier;
- intensity;
- canonical payload bytes;
- payload-schema digest; and
- mandate expiry.

The mandate record additionally freezes the requester, verdict digest and issue time. Target, action, intensity, payload or schema modification produces an envelope-digest mismatch before dispatch.

### Deployed proof

- Malformed payload rejection: [`0xf61957d92a0a6d6814c2d7866dae406b96a8d994a274b738e8cdc90bd9c6ad02`](https://explorer-studio.genlayer.com/tx/0xf61957d92a0a6d6814c2d7866dae406b96a8d994a274b738e8cdc90bd9c6ad02)
- Direct adapter-call rejection: [`0x4a903579a558f2d19daf8b4192f63e26de45576ee2a6d5aae884f566fffade5a`](https://explorer-studio.genlayer.com/tx/0x4a903579a558f2d19daf8b4192f63e26de45576ee2a6d5aae884f566fffade5a)

---

## 6. Contract and integration testing

### Acceptance concern

Earlier tests relied too heavily on simplified models and source-string assertions. They did not sufficiently execute the real five-contract path or accurately model mandate lifecycle behavior.

### Implemented correction

`tests/integration/test_contract_workflow.py` imports and executes the actual contract classes from:

- `contracts/publisher_ledger.py`;
- `contracts/covenant_book.py`;
- `contracts/adjudicator.py`;
- `contracts/mandate_router.py`; and
- `contracts/service_control.py`.

The harness supplies an instrumented GenLayer runtime for addresses, sender/origin separation, contract views and writes, finality-gated child emissions, deterministic time, validator prompts and authority HTTP responses. It does not replace the contract methods with a simplified alternate protocol.

The integration suite covers:

- the complete five-contract permissionless workflow;
- independent requester versus service owner;
- real finality-gated issuance and application calls;
- exact target receipt acknowledgment;
- duplicate execution from `DISPATCHED` and `APPLIED`;
- explicit execution rejection for `FAILED` and `EXPIRED`;
- expired `ISSUED` mandates;
- recovery that reconciles without redispatch;
- malformed and modified payload shapes;
- manipulated authority bytes;
- source-host and source-class independence;
- semantic contradictions and insufficient corroboration; and
- active/superseded covenant lifecycle behavior.

The current test baseline is:

- 42 Python tests passing;
- 15 actual-contract integration tests within that suite;
- all five GenLayer contract sources parsed and validated;
- TypeScript checking passing; and
- Next.js production build passing.

The local commands are:

```bash
npm run check
npm run build
```

---

## 7. Complete GenLayer execution and frontend evidence

### Corrected deployment

All five corrected contracts were redeployed. Deployment, configuration and source commitments are recorded in `deployment-manifest.public.json`. `scripts/verify-deployment.mjs` checks:

- finalized deployment state;
- successful GenVM execution;
- resolved deployed addresses;
- byte-for-byte deployed source equality;
- finalized successful workflow transactions;
- finalized expected-error transactions;
- live USGS and EMSC response digests;
- independent source hosts and authority classes;
- active permissionless covenant state;
- independent requester identity;
- finalized semantic verdict;
- single-dispatch applied mandate;
- exact target receipt;
- manipulated-evidence denial;
- public provenance metadata;
- production build identity; and
- the browser-safe same-origin finalized-read path.

The committed `verification-report.json` contains 88 passing checks.

### Successful end-to-end trace

| Stage | Transaction |
|---|---|
| USGS authority registration | [`0x5676d3dca2b27d994e875520f956f8dbaf17f015ad2612ae5a70ebf97b455f3d`](https://explorer-studio.genlayer.com/tx/0x5676d3dca2b27d994e875520f956f8dbaf17f015ad2612ae5a70ebf97b455f3d) |
| EMSC authority registration | [`0xd43ae0e936866166725537bcba05c278edf24ae023b4ad288dd16e7e101dc21a`](https://explorer-studio.genlayer.com/tx/0xd43ae0e936866166725537bcba05c278edf24ae023b4ad288dd16e7e101dc21a) |
| USGS evidence anchor | [`0x37f9c7e4bddd546ac285cbfc4d66165d6bf9c05e126b188dd8373c485dd8edd8`](https://explorer-studio.genlayer.com/tx/0x37f9c7e4bddd546ac285cbfc4d66165d6bf9c05e126b188dd8373c485dd8edd8) |
| EMSC evidence anchor | [`0x69a3f49fc6c0ba1f9064b03a60707ca9268efc26252bb75bca0439d7a286f64f`](https://explorer-studio.genlayer.com/tx/0x69a3f49fc6c0ba1f9064b03a60707ca9268efc26252bb75bca0439d7a286f64f) |
| Covenant publication | [`0xbfb86aedaba8cc93f6074c32a85a4112180745fa367d41c67f79602f0db19b93`](https://explorer-studio.genlayer.com/tx/0xbfb86aedaba8cc93f6074c32a85a4112180745fa367d41c67f79602f0db19b93) |
| Covenant activation | [`0x3cb7d0716607c1d6747cf1b07dd7074724aaceab34ef52d2794a1ecf2a188c46`](https://explorer-studio.genlayer.com/tx/0x3cb7d0716607c1d6747cf1b07dd7074724aaceab34ef52d2794a1ecf2a188c46) |
| Independent case creation | [`0x69718a54228943af28a459e6cfb35d24c4ffc083309ccad112d7a9367b76a922`](https://explorer-studio.genlayer.com/tx/0x69718a54228943af28a459e6cfb35d24c4ffc083309ccad112d7a9367b76a922) |
| Validator adjudication | [`0x5b626535efaff29218516c04114622f8f5794c4d82e920215ac948f854fd8105`](https://explorer-studio.genlayer.com/tx/0x5b626535efaff29218516c04114622f8f5794c4d82e920215ac948f854fd8105) |
| Finality-gated mandate issue | [`0x3085fd6efa05281250be0b303664b5112fc33040ed8cdd895010508b9c5b2cd3`](https://explorer-studio.genlayer.com/tx/0x3085fd6efa05281250be0b303664b5112fc33040ed8cdd895010508b9c5b2cd3) |
| Permissionless mandate execution | [`0x6f48e98145121d5a7a43713a217438bf57ae4eb825a6e0acf46b17cfaab61d2f`](https://explorer-studio.genlayer.com/tx/0x6f48e98145121d5a7a43713a217438bf57ae4eb825a6e0acf46b17cfaab61d2f) |
| Finality-gated target application | [`0x87c4665f8b9a97928c537f5b11e073f2cdf06c40c54ee542fc0e576d1dbd78ef`](https://explorer-studio.genlayer.com/tx/0x87c4665f8b9a97928c537f5b11e073f2cdf06c40c54ee542fc0e576d1dbd78ef) |
| Receipt reconciliation | [`0xa0597167c431e2535d2f6740ae396be3f0d16ddd55b47cc3132c12564d8f7b47`](https://explorer-studio.genlayer.com/tx/0xa0597167c431e2535d2f6740ae396be3f0d16ddd55b47cc3132c12564d8f7b47) |

### Authoritative state readback

The successful case has:

- case key `kamchatka-independent-claim-v1`;
- decision `BREACH_PROVEN`;
- both source states `SUPPORTS_BREACH`;
- case digest `7c8b781d794c3696b92c92c10e3db33303570d4e9bea43b24e20f4c83b4caa9d`; and
- verdict digest `93e508e8c3c1f56f35c031cd5f7c40c9e2df82541d921b8e031e1c71963343bd`.

The resulting mandate has:

- key `MANDATE-kamchatka-independent-claim-v1`;
- status `APPLIED`;
- dispatch count `1`;
- dispatch state `RECEIPT_CONFIRMED`; and
- action digest `f5670335c784a761d77a09f65965a62e94a0914ea264c42f5fb0c8cd375c5b36`.

`ServiceControl.get_applied_mandate_digest()` returns that exact action digest.

### Frontend completion

Every transaction page contains real-data autofill. Authority autofill retrieves the current USGS or EMSC response through `/api/evidence/authority`, calculates the real digest, and fills the exact registered source, URL, event time, validity and snapshot fields.

Browser reads and finality polling use `POST /api/genlayer`. The endpoint has no signer and exposes only public data. It restricts calls to the five deployed addresses and an explicit allowlist of view methods. Contract reads force `LATEST_FINAL`; transaction writes still require the user's EIP-1193 wallet.

The production `/verification` page visibly performs six checks:

1. USGS authoritative bytes;
2. EMSC authoritative bytes;
3. active immutable covenant;
4. finalized semantic verdict;
5. bounded applied mandate with dispatch count one; and
6. authoritative ServiceControl receipt.

The same page displays the complete source-to-receipt transaction trace and all finalized negative tests.

---

## Negative-test index

| Security property | Result | Transaction |
|---|---|---|
| Activation delay | Premature activation rejected | [`0x2a6609bd2e1b7dcd4368a4150a902d17c2e30d8b2d2a48141bd882fb0705a153`](https://explorer-studio.genlayer.com/tx/0x2a6609bd2e1b7dcd4368a4150a902d17c2e30d8b2d2a48141bd882fb0705a153) |
| Replay protection | Duplicate dispatch rejected | [`0x95ce0605c5dc3693d412d49c589e8ba77e9f4abb97090233d08030fdc4c8ac80`](https://explorer-studio.genlayer.com/tx/0x95ce0605c5dc3693d412d49c589e8ba77e9f4abb97090233d08030fdc4c8ac80) |
| Router-only authorization | Direct adapter call rejected | [`0x4a903579a558f2d19daf8b4192f63e26de45576ee2a6d5aae884f566fffade5a`](https://explorer-studio.genlayer.com/tx/0x4a903579a558f2d19daf8b4192f63e26de45576ee2a6d5aae884f566fffade5a) |
| Schema enforcement | Malformed payload rejected | [`0xf61957d92a0a6d6814c2d7866dae406b96a8d994a274b738e8cdc90bd9c6ad02`](https://explorer-studio.genlayer.com/tx/0xf61957d92a0a6d6814c2d7866dae406b96a8d994a274b738e8cdc90bd9c6ad02) |
| Evidence authenticity | Manipulated digest denied a mandate | [`0x4fc1dffda9c0a5aa5c41637665388d08378b3b9f0aafb8c1d4513550b6b3c8a7`](https://explorer-studio.genlayer.com/tx/0x4fc1dffda9c0a5aa5c41637665388d08378b3b9f0aafb8c1d4513550b6b3c8a7) |
| Expiry | Expired execution rejected | [`0x78b54440080e30c0abf18d35889b9e8d5afb52a832d65de0569639cd7f1c8272`](https://explorer-studio.genlayer.com/tx/0x78b54440080e30c0abf18d35889b9e8d5afb52a832d65de0569639cd7f1c8272) |

---

## Documentation index

| File | Contents |
|---|---|
| `README.md` | Product overview, deployed addresses, guarantees, tests and reproduction commands. |
| `ARCHITECTURE.md` | Five-contract topology, state machines, trust separation and digest design. |
| `SECURITY.md` | Security guarantees, evidence claims, replay/expiry properties, adversarial cases and residual trust. |
| `E2E_RESULTS.md` | Complete successful and negative deployed transaction evidence. |
| `FRONTEND_EVIDENCE.md` | Browser execution model, reproducible UI sequence and frontend-to-chain mapping. |
| `deployment-manifest.public.json` | Machine-readable addresses, source hashes, policy state and transaction identifiers. |
| `verification-report.json` | Full authoritative state readback and 88 passing verification checks. |
| `scripts/verify-deployment.mjs` | Reproducible live verification implementation. |

## Reproduction commands

```bash
npm install
npm run check
npm run build
npm run verify:deployment
npm run verify:deployment:report
```

`verify:deployment` requires only public network access. It does not require a wallet, private key, seed phrase or deployment credential.

## Enforcement scope

The deployed consequence is deliberately bounded to the onchain `ServiceControl` adapter. It does not claim to pause, modify or operate an external payments service. The security demonstration proves independently grounded breach assessment, finality-gated capability issuance, one-shot execution, strict payload validation, expiry, target authorization and authoritative receipt reconciliation for the deployed adapter.

## Acceptance conclusion

The corrected protocol no longer relies on same-host owner-selected evidence or owner-only initiation and execution. Validators independently retrieve exact records from USGS and EMSC, distinguish authentic corroboration from manipulated bytes, and issue only a digest-bound and expiring capability. The Router permits exactly one dispatch, recovery cannot redispatch, the target repeats authorization and schema checks, and every material success and rejection is represented by finalized Studionet evidence. The repository source, deployed contracts, tests, frontend and documentation are aligned and reproducibly verifiable.
