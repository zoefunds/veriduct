# VERIDUCT architecture

## Trust model

VERIDUCT separates five powers: publishing an observation, defining a policy, interpreting evidence, issuing authority, and applying a consequence. No contract can exercise the complete chain by itself.

```text
Publisher A ─┐
             ├─ immutable byte anchors ─┐
Publisher B ─┘                          │
                                        v
Owner ─ covenant + bounded remedy ─> Adjudicator
                                        │ FINALIZED
                                        v
                                  Mandate Router
                                        │ FINALIZED
                                        v
                                  Service Adapter
```

## Authenticity boundary

Publisher registration binds an onchain wallet to one canonical hostname. A snapshot is an immutable claim by that wallet over a canonical HTTPS URL, exact SHA-256 digest, observation time, expiry, and monotonic publisher sequence. During adjudication, each validator fetches the URL itself. Code—not the language model—derives the response status and content digest. Content enters the semantic prompt only on an exact match.

This does not claim that a publisher is universally truthful. It proves which registered publisher made the observation, that the requested URL belongs to its declared origin, and that validators interpreted the same bytes it anchored. Covenants reduce publisher risk by pre-committing multiple independent identities and a distinct-publisher threshold.

## Generic action adapters

The router knows no service-specific methods. Target governance registers an action ID, target, and payload-schema digest. Registration succeeds only when the target reports the same governance address and attests support for that exact pair. All targets implement one interface:

```text
apply_mandate(action_id, intensity, payload_json, mandate_key, action_digest, holder)
```

Service-specific validation remains inside the adapter, where it belongs. A new adapter or action requires no router redeployment.

## Finality state machine

```text
OPEN_CASE
  → CLOSED_NO_MANDATE
  → MANDATE_PENDING_FINALITY
       → ISSUED
            → DISPATCHED
                 → APPLIED
```

`ACCEPTED` is not represented as authority. A proven verdict emits issuance only on finality. A dispatch emits target application only on finality. Reconciliation reads the target’s applied digest before recording `APPLIED`.

## Failure behavior

- Fetch failure or digest mismatch: source becomes unavailable.
- Authentic sources below threshold: insufficient corroboration.
- Material publisher disagreement: conflicting observations.
- Remedy exceeds covenant or adapter bounds: rejected deterministically.
- Adapter route changes: case opening or execution rejects.
- Failed child application: mandate stays dispatched and can be reconciled or exactly retried; bindings cannot change.
- Duplicate delivery: target returns idempotently only for the identical digest and rejects conflicting reuse.
