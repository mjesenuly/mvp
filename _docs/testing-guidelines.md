# Testing strategy

Run meaningful unit, API integration, DOM interaction and actual browser checks when available; never describe DOM tests as visual browser testing. Record exact executed commands/results. Shared behavior tests must exercise in-memory and ORM repository adapters. Verify actual SQLite restart persistence and migration idempotent execution, not merely unchanged frontend state.

Test customer/workshop/admin ownership; pending workshop denial; hidden competitor quotes; authorized photo retrieval and malicious file/count/size inputs; null versus zero and optional fees; one active offer; concurrent/repeated accept; immutable accepted terms; revision acceptance/rejection and work blocking; owner-only cancellation/completion; invalid transitions and immutable server event history. Test UI loading, empty, validation, server failure and 409 conflicts. Exercise complete customer and workshop journeys in running application.

QA independently verifies each criterion, reports original failures and retests repairs. Real user-test defects get real labelled issues and regression cases. Final build/start/health and clean setup are distinct from unit tests. No PASS or screenshot claim without actual execution/capture.
