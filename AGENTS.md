# RepairLens agent instructions

Read `_docs/plan.md`, `_docs/process.md`, assigned issue and your role under `_docs/team/` before work. Product confirmed in discovery overrides the initial proposal. Never fabricate conversations, source review, design-agent output, test evidence, issues, commits or timestamps.

Mandatory strict sequence: frontend mock → OpenAPI contract → in-memory API → TypeORM persistent SQLite → real frontend integration → user testing and repairs. Work on ONE issue through PM grooming, engineer implementation, independent QA, fixes/retest and QA closure before starting the next. No overlapping next-issue engineering during prior QA. Actual GitHub issues become canonical after creation; local issue files are specifications only.

QA closes verified `mvp` and `user-test-bug` issues as required by Part II, overriding the article's orchestrator closure assignment. Engineer never closes issues. Orchestrator coordinates and publishes actual evidence. Domain logic must remain independent of storage, with repository parity tests. Protect request/contact/photo access server-side. Accepted commercial terms and activity history are immutable. Unknown cost is not zero. Never commit secrets. English UI/docs; Russian product discussion.

## Deployment assignment continuation

The user authorized continuing this existing repository for Test, Containerise and Deploy. The current deadline is **3 November 2026, 14:00 Kazakhstan time (UTC+5)**; the October deadline in historical Part II documents is not the new deadline. All current communication and deliverables are English, as requested by the user. Do not replay the completed MVP iterations. Follow the same sequential real-issue PM → engineer → independent QA → closure workflow for deployment work. Every implemented feature has a separate `e2e-test` issue and must use Playwright against the real stack. See `_docs/deployment-plan.md`. No paid cloud account upgrade or invented deployment/test evidence is authorized.
