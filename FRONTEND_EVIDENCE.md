# Frontend execution and readback evidence

This document maps every live frontend surface to finalized Studionet evidence. The production build identity is exposed at `GET /api/build`; the browser-facing verifier is [https://veri-duct.vercel.app/verification](https://veri-duct.vercel.app/verification).

## Browser execution model

Wallet writes are submitted through the user's EIP-1193 provider. The frontend then polls `POST /api/genlayer` for the public transaction record until `FINALIZED`; it does not treat `ACCEPTED` as success. Public contract reads use the same same-origin route and force `LATEST_FINAL`. The route permits only the five deployed addresses and an explicit allowlist of view methods. This avoids browser CORS dependence without introducing a signer, private RPC capability, or mutable backend state.

Authority autofill uses `GET /api/evidence/authority?source=usgs|emsc`. The server retrieves the real authority response bytes and returns their SHA-256 digest, exact URL, event time, byte count, and source key. It never fabricates a measurement.

## Reproducible UI sequence

1. **Publishers** — select `USGS M8.8 record` and `EMSC M8.8 record`; autofill retrieves the live authority digest and fills both anchor forms.
2. **Covenants** — select the seismic safety preset; the form contains both registered source keys, two required authority classes, `PERMISSIONLESS` claim mode, strict evidence policy, and the bounded read-only action.
3. **Decision lab** — from any wallet, load the active covenant, select both finalized snapshots, and open the case. Another participant may call adjudication.
4. **Mandates** — load the issued mandate, execute its exact frozen envelope once, then reconcile the target receipt. Execution does not require the covenant owner.
5. **Service** — read the latest-final adapter status and exact applied mandate count.
6. **Verification** — re-fetch both authority digests and read the active covenant, verdict, mandate, and target receipt. The page also exposes every successful and negative-test transaction as an explorer link.

## Finalized successful trace

| Frontend stage | Transaction |
|---|---|
| USGS anchor | `0x37f9c7e4bddd546ac285cbfc4d66165d6bf9c05e126b188dd8373c485dd8edd8` |
| EMSC anchor | `0x69a3f49fc6c0ba1f9064b03a60707ca9268efc26252bb75bca0439d7a286f64f` |
| Covenant publish | `0xbfb86aedaba8cc93f6074c32a85a4112180745fa367d41c67f79602f0db19b93` |
| Covenant activate | `0x3cb7d0716607c1d6747cf1b07dd7074724aaceab34ef52d2794a1ecf2a188c46` |
| Independent case open | `0x69718a54228943af28a459e6cfb35d24c4ffc083309ccad112d7a9367b76a922` |
| Validator adjudication | `0x5b626535efaff29218516c04114622f8f5794c4d82e920215ac948f854fd8105` |
| Finality-gated mandate issue | `0x3085fd6efa05281250be0b303664b5112fc33040ed8cdd895010508b9c5b2cd3` |
| Permissionless execution | `0x6f48e98145121d5a7a43713a217438bf57ae4eb825a6e0acf46b17cfaab61d2f` |
| Finality-gated target apply | `0x87c4665f8b9a97928c537f5b11e073f2cdf06c40c54ee542fc0e576d1dbd78ef` |
| Receipt reconciliation | `0xa0597167c431e2535d2f6740ae396be3f0d16ddd55b47cc3132c12564d8f7b47` |

The case requester and successful dispatcher are `0xF526ADbdEB5169e7CeA32c06EF69d7ce4a2D6276`; service governance is the different address `0x8D4E752AE688C21eC7C7D4d8a232B5e0700DBf0f`.

## Browser-visible authoritative result

The `/verification` page must render six green checks:

- USGS authoritative bytes;
- EMSC authoritative bytes;
- active immutable covenant;
- finalized semantic verdict;
- bounded mandate with dispatch count one; and
- authoritative target receipt.

The reproducible command-line counterpart is `npm run verify:deployment`. It also verifies deployed contract source bytes, all finality results, rejection transactions, independent hosts/classes, permissionless claimant identity, manipulated-evidence denial, and the production build identity. Its last complete output is committed in `verification-report.json`.

## Scope

The frontend proves public authority retrieval, wallet-submitted GenLayer operations, finalized state transitions, and authoritative readback for the deployed `ServiceControl` adapter. It does not claim control over an external production system or independent certification of USGS/EMSC scientific accuracy.
