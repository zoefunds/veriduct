# VERIDUCT

**Authenticated observations. Independent adjudication. Bounded operations.**

VERIDUCT is a GenLayer-native service-reliability covenant network. An operator commits a precise reliability policy, independent telemetry publishers anchor immutable observations, and validators determine whether a requested operational remedy is justified. Authority exists only after finality and can execute only the exact target, action, intensity, payload, schema, covenant, and case that validators assessed.

Production: **[veri-duct.vercel.app](https://veri-duct.vercel.app)**

The interface reads finalized Studionet state directly. It has no backend account, database, indexer, or offchain authority service.

## Why GenLayer

A normal smart contract can compare latency numbers, but it cannot reliably decide whether heterogeneous status reports, maintenance notices, and independent monitor results collectively satisfy a natural-language service covenant. VERIDUCT makes that semantic decision the only nondeterministic step. Everything around it—publisher identity, byte authenticity, quorum, policy version, bounds, expiry, routing, replay protection, and target authorization—is deterministic.

## System

| Contract | Responsibility |
|---|---|
| `PublisherLedger` | Registers publisher identities and anchors URL, origin, timestamp, sequence, and SHA-256 content digest. |
| `CovenantBook` | Stores immutable, delayed, monotonic covenant versions with publisher quorum and remedy bounds. |
| `Adjudicator` | Fetches exact anchored bytes, verifies authenticity, performs independent semantic evaluation, and issues only on finality. |
| `MandateRouter` | Registers target-owned adapters and dispatches exact digest-bound mandates through one generic interface. |
| `ServiceControl` | Demonstrates two operational remedies and independently checks router, governance, schema bounds, and replay. |

## Security properties

- A source contributes authority only when its registered identity, exact origin, freshness window, HTTPS response, and fetched SHA-256 digest all match its immutable anchor.
- Corroboration requires distinct publisher identities. Reusing one publisher cannot satisfy quorum.
- Covenant versions are immutable, owner-locked, delayed, and monotonic.
- A new service key cannot control an existing target: the covenant owner must equal target governance, and the target checks the mandate holder again.
- The router contains no action-specific target calls. Governance registers `(action_id, target, payload_schema_digest)` against a target that attests support for the schema.
- Assessment→issuance and dispatch→application are separate `FINALIZED` child transactions.
- Mandates are holder-bound, target-bound, action-bound, intensity-bound, schema-bound, payload-bound, covenant-bound, case-bound, expiring, and single-use.
- Unavailable, stale, oversized, mismatched, conflicting, or insufficient evidence fails closed.

## Local verification

Requirements: Node 20+, Python 3.12+.

```bash
npm install
npm run typecheck
npm test
npm run test:contracts
npm run build
```

The tests include a complete registry-to-target model and explicit regressions for target seizure, forged publisher identity, origin substitution, fake quorum, every envelope-field mutation, non-proven verdict issuance, and replay after application.

## Deployment

VERIDUCT targets stable GenLayer Studionet only:

- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Repository-local CLI: `genlayer@0.39.1`

```bash
npm install
npx --no-install genlayer deploy
cp .env.generated .env.local
npm run build
```

Deployment order is Ledger → Book → Router → Adjudicator → one-time Router binding → Service adapter. Register each adapter only after all deployments finalize.

### Verified Studionet deployment

| Contract | Address |
|---|---|
| PublisherLedger | `0x5834e07BEd3Efa9038C66cb6dEBd1BAA5A702d43` |
| CovenantBook | `0x380a776a5895647b4D82103a47ba1d4E3e9d0338` |
| Adjudicator | `0x9967beb076c6087C56486D1E89F8B85128c90b5E` |
| MandateRouter | `0x5966dF42ff5E1Dc3698FB4660Eeb3683c760bb5C` |
| ServiceControl | `0x846C908b0a1d1245ca4292A8cCF1dF04941CAE18` |

The full finalized deployment and adapter-registration transaction record is committed in `deployment-manifest.public.json`.

## One-click demo data

Every write surface includes a **Demo autofill** control. The evidence controls request fresh, deterministic observations from the production evidence routes, calculate their SHA-256 digests in the browser, and fill the exact URL, publisher, observation time, validity, and digest. Finalized snapshot keys are remembered locally and carried into the case form; the exact case envelope is then carried into mandate execution. Users still approve every onchain transaction in their own wallet.

## Review path

1. Register two publisher identities from different wallets and origins.
2. Anchor two fresh snapshots containing the exact fetched-byte digests.
3. Register both service actions with the router from the target-governance wallet.
4. Publish a covenant requiring both publishers and activate it after the delay.
5. Prove that stale data, a forged origin, duplicate publishers, or a mismatched digest cannot reach semantic adjudication.
6. Open a case with a bounded action and canonical payload.
7. Adjudicate, then show that an accepted parent has no mandate until the issuance child is finalized.
8. Execute the mandate, then show that the target changes only when the application child finalizes.
9. Reconcile the mandate and prove replay rejection.
10. Mutate target, action, intensity, payload, schema, covenant, or case and prove digest rejection.
11. Create a fresh service key from another wallet and prove the existing target rejects the entire authority chain.

## Product interface

The frontend is organized as an operations topology rather than a form wizard:

- **Network** — authority graph and deployment posture
- **Publishers** — identity and immutable observation anchoring
- **Covenants** — versioned policy composer
- **Decision lab** — frozen case construction and verdict vocabulary
- **Mandates** — exact authority dispatch
- **Service** — finalized consequence state

No browser state is authoritative. Reads use `LATEST_FINAL`, writes wait for `FINALIZED`, and production configuration fails visibly when addresses are missing.
