# VERIDUCT failed and delayed recovery verification

## Purpose

This document addresses the follow-up request that failed and delayed mandate recovery be tested through the actual contract implementation. It records the added test coverage, the exact contract methods exercised, the expected lifecycle transitions, replay-safety assertions, reproduction commands, and verified results as of 13 October 2026.

The implementation and tests are committed at:

`b2d7940fc0bc1ea06aab1da7b120656f1d65fcf7`

## Follow-up requirement

The earlier integration suite proved successful receipt reconciliation but did not execute the missing-receipt and conflicting-receipt outcomes through the actual contract classes. The required coverage was:

1. a delayed target receipt before mandate expiry;
2. a permanently missing target receipt after expiry;
3. a nonempty target receipt that conflicts with the Router's frozen action digest;
4. proof that recovery never sends the remedy a second time; and
5. proof that terminal recovery states cannot be executed again.

## Actual contracts under test

`tests/integration/test_contract_workflow.py` dynamically imports the repository contract files themselves:

- `contracts/publisher_ledger.py`;
- `contracts/covenant_book.py`;
- `contracts/adjudicator.py`;
- `contracts/mandate_router.py`; and
- `contracts/service_control.py`.

The harness provides GenLayer runtime boundaries—addresses, sender and origin identity, contract lookup, deterministic time, authority HTTP responses, nondeterministic validator output, views, writes, and finalized child delivery. It does not replace `MandateRouter.execute_mandate()`, `reconcile_mandate()`, `recover_dispatch()`, or `ServiceControl.apply_mandate()` with a simplified lifecycle model.

The import path is implemented by `load_contract()`, which loads each Python file from the repository's `contracts/` directory and instantiates its real contract class.

## Router behavior being verified

`MandateRouter.execute_mandate()` permits execution only from `ISSUED`. Before emitting the finalized target child it stores:

- `status = DISPATCHED`;
- `dispatch_count = 1`;
- `dispatch_tx_state = FINALITY_PENDING`;
- the dispatcher; and
- the dispatch timestamp.

`recover_dispatch()` delegates only to `reconcile_mandate()`. It cannot emit `apply_mandate()` and cannot increment `dispatch_count`.

For a `DISPATCHED` mandate, reconciliation reads `ServiceControl.get_applied_mandate_digest(mandate_key)` and applies the following rules:

| Target readback | Time condition | Router result |
|---|---|---|
| Equals frozen `action_digest` | Any valid reconciliation time | `APPLIED`, `RECEIPT_CONFIRMED` |
| Nonempty and unequal to `action_digest` | Any time | `FAILED`, `CONFLICTING_RECEIPT` |
| Empty | Before or at expiry | Remains `DISPATCHED`, `FINALITY_PENDING` |
| Empty | After expiry | `EXPIRED`, `NO_RECEIPT_BEFORE_EXPIRY` |

`APPLIED`, `FAILED`, and `EXPIRED` are terminal. `execute_mandate()` rejects every state other than `ISSUED`.

## Added delayed and missing receipt test

Test:

`test_delayed_then_missing_receipt_uses_actual_recovery_without_redispatch`

The test performs the following sequence:

1. Opens and adjudicates a real five-contract case to issue a mandate.
2. Configures the runtime harness to suppress exactly one finalized target-child invocation.
3. Calls the actual `MandateRouter.execute_mandate()` method.
4. Confirms the Router stored `DISPATCHED`, `FINALITY_PENDING`, and `dispatch_count = 1`.
5. Confirms `ServiceControl` has no applied-mandate history because the target child produced no receipt.
6. Calls the actual `recover_dispatch()` method before expiry.
7. Confirms the mandate remains `DISPATCHED` rather than being falsely marked successful or failed.
8. Confirms recovery did not invoke the target or increment the dispatch count.
9. Advances deterministic contract time beyond the mandate's frozen `expires_at` value.
10. Calls the actual `recover_dispatch()` method again.
11. Confirms the Router transitions to `EXPIRED` with `NO_RECEIPT_BEFORE_EXPIRY`.
12. Confirms the target still has no application history and no second target call was emitted.

This single test distinguishes a genuinely delayed receipt from a permanently missing receipt: absence is nonterminal before expiry and terminal after expiry.

## Added conflicting receipt test

Test:

`test_conflicting_receipt_marks_failed_without_redispatch`

The test performs the following sequence:

1. Opens and adjudicates a real five-contract case to issue a mandate.
2. Suppresses exactly one finalized target-child invocation.
3. Calls the actual `MandateRouter.execute_mandate()` method.
4. Places a nonempty digest in the target readback that intentionally differs from the Router's immutable `action_digest`.
5. Calls the actual `recover_dispatch()` method.
6. Confirms the Router transitions to `FAILED` with `CONFLICTING_RECEIPT`.
7. Confirms the conflicting digest does not equal the frozen action digest.
8. Confirms `dispatch_count` remains exactly one.
9. Calls recovery a second time and confirms the mandate remains terminally `FAILED`.
10. Attempts another execution and confirms it rejects as not executable.
11. Confirms no target application and no redispatch occurred.

## Why controlled fault injection is appropriate

The deployed `ServiceControl` correctly stores the exact action digest when `apply_mandate()` succeeds. A conflicting receipt therefore cannot be created through its valid public interface. Likewise, a deterministic test must control whether a finalized child produces a target receipt in order to reproduce delayed delivery.

The harness controls only these external conditions:

- whether one finalized child invocation is delivered; and
- what digest the target view returns for the adversarial conflicting-receipt case.

All lifecycle decisions remain inside the repository's real `MandateRouter` methods. The tests do not manually assign Router status to manufacture the expected result.

## Replay-safety assertions

The recovery tests explicitly assert:

- `dispatch_count` is one after the initial dispatch;
- delayed recovery does not change the dispatch count;
- expiry recovery does not change the dispatch count;
- conflicting-receipt recovery does not change the dispatch count;
- the dropped finalized-call count remains one;
- target history remains empty when delivery was suppressed;
- repeated recovery from `FAILED` does not send a target call; and
- execution from `FAILED` is rejected.

These assertions prove that recovery means receipt inspection and lifecycle closure, never remedy retransmission.

## Reproduction

Run the focused recovery tests:

```bash
npm run test:recovery
```

Expected result:

```text
3 passed, 14 deselected
```

Run the complete repository verification:

```bash
npm run check
npm run build
npm run verify:deployment
```

Verified results on 13 October 2026:

- focused recovery tests: 3 passed;
- complete Python suite: 44 passed;
- actual-contract integration suite: 17 passed;
- TypeScript checking: passed;
- all five GenLayer contract sources: parsed and validated;
- Next.js production build: passed; and
- public Studionet deployment verifier: 88 of 88 checks passed.

## Evidence boundaries

The public Studionet verifier proves the deployed successful receipt path, source-to-deployment equality, finalized transaction outcomes, and authoritative state readback. The deterministic actual-contract integration tests prove the delayed, missing, and conflicting receipt branches that a correctly behaving deployed target does not naturally expose.

No contract redeployment was required for this follow-up because the Router already implemented the required recovery transitions. The identified deficiency was missing executable coverage of those branches. This change adds that coverage without modifying deployed contract source.

## Continuous integration status

The repository contains `.github/workflows/ci.yml`, which runs dependency installation, `npm run check`, and `npm run build`. GitHub did not start the first hosted runner because the repository owner's GitHub account is currently locked due to a billing issue. GitHub reported no test or workflow-step failure; the job had no runner and no executed steps. The same commands completed successfully in the local verification environment.

## Conclusion

The follow-up testing gap is resolved. The integration suite no longer covers only successful receipt reconciliation. It now executes matching, delayed, permanently missing, and conflicting receipt outcomes through the actual contract classes and verifies every corresponding Router state transition, terminal-state rule, and no-redispatch invariant.
