# VERIDUCT test methodology

This document describes the executable test evidence as of 13 October 2026. It distinguishes deterministic actual-contract integration tests from public Studionet transaction verification.

## Commands and current baseline

```bash
npm run check
npm run test:recovery
npm run build
npm run verify:deployment
```

`npm run check` performs TypeScript checking, runs 44 Python tests, and parses and validates all five GenLayer contract sources. Seventeen tests in `tests/integration/test_contract_workflow.py` import and execute the repository's actual `PublisherLedger`, `CovenantBook`, `Adjudicator`, `MandateRouter`, and `ServiceControl` classes.

`npm run test:recovery` is the focused reviewer command for matching, delayed, missing, and conflicting receipt behavior.

The integration runtime supplies deterministic contract addresses, sender/origin separation, time, authority HTTP responses, validator output, contract views/writes, and finalized child delivery. It does not reimplement the contracts' lifecycle rules.

## Receipt recovery matrix

| Scenario | Setup | Actual method exercised | Required result | Replay assertion |
|---|---|---|---|---|
| Matching receipt | Target child applies the frozen action digest | `execute_mandate`, then `recover_dispatch`/`reconcile_mandate` | `APPLIED`, `RECEIPT_CONFIRMED` | One dispatch and one target history entry |
| Delayed receipt | Harness suppresses exactly one finalized target child | `execute_mandate`, then `recover_dispatch` before expiry | Remains `DISPATCHED`, `FINALITY_PENDING` | One dispatch and zero target history entries |
| Permanently missing receipt | Same dropped child; deterministic clock advances beyond `expires_at` | `recover_dispatch` after expiry | `EXPIRED`, `NO_RECEIPT_BEFORE_EXPIRY` | One dispatch and zero target history entries |
| Conflicting receipt | Same dropped child; target readback is populated with a nonempty digest different from `action_digest` | `recover_dispatch` | `FAILED`, `CONFLICTING_RECEIPT` | One dispatch, zero target history entries, later execution rejected |

The delayed/missing test is `test_delayed_then_missing_receipt_uses_actual_recovery_without_redispatch`. It first proves that an absent receipt before expiry does not falsely mark success or failure. It then advances the same contract clock beyond the frozen mandate expiry and proves that recovery closes the mandate as `EXPIRED` without calling the target.

The conflicting test is `test_conflicting_receipt_marks_failed_without_redispatch`. It presents a nonempty target receipt that does not equal the Router's immutable action digest and proves that the actual Router transitions to `FAILED`. A second recovery remains terminal, a later execution attempt rejects, `dispatch_count` remains one, and no new target call is emitted.

## Why fault injection is required

The deployed `ServiceControl` correctly writes the exact action digest, so a conflicting receipt cannot be produced through its valid public interface. The integration harness therefore injects a corrupt target readback only after executing the actual Router dispatch path. Likewise, it suppresses one finalized child invocation to reproduce delayed or failed child delivery deterministically. The code under assertion remains the real Router and target code; only the external delivery/readback condition is controlled.

## Public deployment verification

`npm run verify:deployment` is complementary. It reads public Studionet transactions and latest-final contract state, byte-compares all five deployed contract sources with this repository, re-fetches USGS and EMSC bytes, and verifies the successful case, mandate, target receipt, negative transactions, and frontend build identity. Its committed output is `verification-report.json` with 88 passing checks.

The public report proves the deployed successful path and finalized rejection evidence. The deterministic integration suite proves failure states that a correct target does not naturally expose, particularly delayed, missing, and conflicting receipt recovery.
