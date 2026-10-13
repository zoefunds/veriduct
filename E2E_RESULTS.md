# Studionet end-to-end verification

Executed and independently re-verified from public state on 12 October 2026 on GenLayer Studionet (`61999`). Every success and expected rejection below is a real finalized transaction, not a local fixture or simulated receipt. Explorer base: `https://explorer-studio.genlayer.com/tx/`.

## Deployment and configuration

| Operation | Transaction |
|---|---|
| Deploy PublisherLedger | [`0x85253a0f…6ddfb`](https://explorer-studio.genlayer.com/tx/0x85253a0f2662c1502e540214e26c93cf47450b351cf3cd7609b8973664c6ddfb) |
| Deploy CovenantBook | [`0xa2a87664…d4d9`](https://explorer-studio.genlayer.com/tx/0xa2a876644b42aefa1a5b82bb69697fcd4a27cab47d01275faffd8d77df18d4d9) |
| Deploy MandateRouter | [`0xf384590f…e0c2`](https://explorer-studio.genlayer.com/tx/0xf384590fd34ad557060f9ecce4ca4caaa78b2200ee53470ba4e5e0f2b9d9e0c2) |
| Deploy Adjudicator | [`0xe9974edb…5370`](https://explorer-studio.genlayer.com/tx/0xe9974edbf3f56748720753d31a52cd17313d9882b6cfe75d713963d1c9135370) |
| Deploy ServiceControl | [`0x597a3da0…31ac`](https://explorer-studio.genlayer.com/tx/0x597a3da0d844eef986a9e324e47feaf7ce85a877b5101ac12ed4ca58c45f31ac) |
| Register USGS authority | [`0x5676d3dc…5f3d`](https://explorer-studio.genlayer.com/tx/0x5676d3dca2b27d994e875520f956f8dbaf17f015ad2612ae5a70ebf97b455f3d) |
| Register EMSC authority | [`0xd43ae0e9…21a`](https://explorer-studio.genlayer.com/tx/0xd43ae0e936866166725537bcba05c278edf24ae023b4ad288dd16e7e101dc21a) |
| Bind adjudicator | [`0x22355080…3cd`](https://explorer-studio.genlayer.com/tx/0x22355080c9e499f67fd6ecc2d0accf9b1136db29fd49ee15e5327680a23dc3cd) |
| Register read-only adapter | [`0x0bc0b224…d405`](https://explorer-studio.genlayer.com/tx/0x0bc0b224a9fa8c4f88c90057dc6f9fdc9eebf88ee64e784386f3f23d2238d405) |
| Register review adapter | [`0xe2b0f7bf…901c`](https://explorer-studio.genlayer.com/tx/0xe2b0f7bf8e3398fcba34caa6fa900c479c72ec6f777cb705835e373ed1ea901c) |

All five deployment transactions are `FINALIZED`, report GenVM `SUCCESS`, resolve to the published addresses, and contain contract source bytes identical to this repository.

## Authority evidence

USGS snapshot `usgs-kamchatka-2025-v1` finalized in [`0x37f9c7e4…edd8`](https://explorer-studio.genlayer.com/tx/0x37f9c7e4bddd546ac285cbfc4d66165d6bf9c05e126b188dd8373c485dd8edd8). Its exact QuakeML SHA-256 is `8e91ad76139bae8bd9efc3935760ef5493d8d6a02d0d1d1a4cda10bab56331b7`.

EMSC snapshot `emsc-kamchatka-2025-v1` finalized in [`0x69a3f49f…f64f`](https://explorer-studio.genlayer.com/tx/0x69a3f49fc6c0ba1f9064b03a60707ca9268efc26252bb75bca0439d7a286f64f). Its exact JSON SHA-256 is `9558eae3d2ea9b891602f148c57a116d6ca1b2c7c7c033631330d229e019556b`.

The sources are distinct in operator, authority class, hostname, API, format, and record. Authentication proves the bytes. Validator comparison establishes material agreement; neither mechanism independently certifies scientific accuracy beyond the authorities' records.

## Successful permissionless workflow

1. Governance published covenant v1 in [`0xbfb86aed…9b93`](https://explorer-studio.genlayer.com/tx/0xbfb86aedaba8cc93f6074c32a85a4112180745fa367d41c67f79602f0db19b93). An early activation attempt correctly rejected in [`0x2a6609bd…a153`](https://explorer-studio.genlayer.com/tx/0x2a6609bd2e1b7dcd4368a4150a902d17c2e30d8b2d2a48141bd882fb0705a153), then activation finalized in [`0x3cb7d071…8c46`](https://explorer-studio.genlayer.com/tx/0x3cb7d0716607c1d6747cf1b07dd7074724aaceab34ef52d2794a1ecf2a188c46).
2. Independent wallet `0xF526ADbdEB5169e7CeA32c06EF69d7ce4a2D6276`, not owner `0x8D4E…Bf0f`, opened `kamchatka-independent-claim-v1` in [`0x69718a54…a922`](https://explorer-studio.genlayer.com/tx/0x69718a54228943af28a459e6cfb35d24c4ffc083309ccad112d7a9367b76a922).
3. Validator adjudication finalized in [`0x5b626535…8105`](https://explorer-studio.genlayer.com/tx/0x5b626535efaff29218516c04114622f8f5794c4d82e920215ac948f854fd8105). Consensus re-fetched both URLs, matched both frozen digests, classified both source states as `SUPPORTS_BREACH`, and finalized `BREACH_PROVEN`.
4. The finality child issued `MANDATE-kamchatka-independent-claim-v1` in [`0x3085fd6e…2cd3`](https://explorer-studio.genlayer.com/tx/0x3085fd6efa05281250be0b303664b5112fc33040ed8cdd895010508b9c5b2cd3).
5. The independent participant executed the exact mandate in [`0x6f48e981…1d2f`](https://explorer-studio.genlayer.com/tx/0x6f48e98145121d5a7a43713a217438bf57ae4eb825a6e0acf46b17cfaab61d2f). Finalized target application is [`0x87c4665f…78ef`](https://explorer-studio.genlayer.com/tx/0x87c4665f8b9a97928c537f5b11e073f2cdf06c40c54ee542fc0e576d1dbd78ef).
6. Receipt reconciliation finalized in [`0xa0597167…7b47`](https://explorer-studio.genlayer.com/tx/0xa0597167c431e2535d2f6740ae396be3f0d16ddd55b47cc3132c12564d8f7b47).

Authoritative readback: case digest `7c8b781d…caa9`; verdict digest `93e508e8…43bd`; action digest `f5670335…5b36`; mandate `APPLIED`; `dispatch_count = 1`; target receipt equals the exact action digest.

## Negative and lifecycle proofs

| Test | Finalized result | Transaction |
|---|---|---|
| Execute an already applied mandate | Rejected: mandate is not executable from current state | [`0x95ce0605…ac80`](https://explorer-studio.genlayer.com/tx/0x95ce0605c5dc3693d412d49c589e8ba77e9f4abb97090233d08030fdc4c8ac80) |
| Call ServiceControl directly | Rejected: only MandateRouter may apply remedies | [`0x4a903579…de5a`](https://explorer-studio.genlayer.com/tx/0x4a903579a558f2d19daf8b4192f63e26de45576ee2a6d5aae884f566fffade5a) |
| Open case with malformed remedy payload | Rejected by target schema validation | [`0xf61957d9…ad02`](https://explorer-studio.genlayer.com/tx/0xf61957d92a0a6d6814c2d7866dae406b96a8d994a274b738e8cdc90bd9c6ad02) |
| Anchor syntactically valid but false USGS digest | Anchor stored for adversarial test | [`0xe5c2a135…b4e0`](https://explorer-studio.genlayer.com/tx/0xe5c2a1356a1f710da9f3af1b26940fce717f7754364cf0f96db1b9c9805cb4e0) |
| Adjudicate false-digest case | `CLOSED_NO_MANDATE`, `INSUFFICIENT_CORROBORATION`, no mandate key | [`0x4fc1dffd…c8a7`](https://explorer-studio.genlayer.com/tx/0x4fc1dffda9c0a5aa5c41637665388d08378b3b9f0aafb8c1d4513550b6b3c8a7) |
| Execute after five-minute mandate TTL | Rejected by expiry guard before target emission | [`0x78b54440…8272`](https://explorer-studio.genlayer.com/tx/0x78b54440080e30c0abf18d35889b9e8d5afb52a832d65de0569639cd7f1c8272) |

The expiry proof used active covenant v2, independent case [`0x86f3d6b9…e22b`](https://explorer-studio.genlayer.com/tx/0x86f3d6b925e4876d134b052d294c95775ee74626cb7848bcdcdebf337303e22b), and validator adjudication [`0xe8c0693e…8b59`](https://explorer-studio.genlayer.com/tx/0xe8c0693eca2d32bc5a82e14bb9525f1ade26987f7f4bd9c714be3760eab88b59). Its mandate expired at Unix `1791835410`; the complete execution envelope was submitted after expiry and no target child was emitted.

The successful applied workflow uses covenant v1, while the expiry proof uses the currently active v2. The version difference is deliberate: v2 reduced the mandate TTL to five minutes specifically for an observable, finalized expiry test without altering the already finalized v1 case or receipt.

## Reproduction

Run `npm run verify:deployment`. It checks finalized success/error outcomes, byte-compares deployed contract code with local source, re-fetches both authority URLs, reads the active permissionless policy, confirms the claimant differs from the owner, validates the successful verdict/mandate/receipt chain, and confirms the manipulated case produced no mandate. `npm run verify:deployment:report` writes all authoritative records to `verification-report.json`; the report regenerated on 12 October 2026 passed 88 of 88 assertions.

The `/verification` frontend performs the corresponding public readback without a private key through an allowlisted same-origin `LATEST_FINAL` read route, avoiding browser RPC/CORS dependence. It also displays the complete source-to-receipt trace and finalized negative-test links. The exact browser workflow is documented in [FRONTEND_EVIDENCE.md](./FRONTEND_EVIDENCE.md). Enforcement shown here is scoped to the deployed `ServiceControl` adapter; it is not evidence of control over an external production service.

## Recovery failure evidence boundary

The finalized transactions above prove the deployed successful receipt path, duplicate-execution rejection, and expired execution rejection. Delayed, absent, and conflicting target receipts require controlled fault conditions that the correctly operating deployed `ServiceControl` does not expose through its public interface.

Those branches are tested by importing and executing the actual contract classes in `tests/integration/test_contract_workflow.py`. The suite suppresses one finalized child delivery to reproduce delayed and permanently missing receipts, and supplies an unequal nonempty target readback to reproduce a conflicting receipt. It then calls the real `recover_dispatch()` method and verifies `DISPATCHED`, `EXPIRED`, and `FAILED` respectively, always with one dispatch and no retransmission. See [TESTING.md](./TESTING.md) and [review2.md](./review2.md).
