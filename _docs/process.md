# Process and source/assignment precedence

Strict sequential iterations: (1) frontend mock, (2) full OpenAPI contract, (3) in-memory API, (4) TypeORM persistent SQLite/migrations, (5) real frontend integration, (6) running user tests/repairs/CI/setup. Each iteration has a meaningful MVP issue. GitHub becomes canonical after real issues exist; local specifications are not claims of publication.

For each issue: PM grooms checkable criteria → engineer implements and tests → independent QA evaluates every criterion → FAIL returns to engineer → QA retests → PASS permits QA closure → only then select next issue. No implementation/QA overlap across issues. Record actual commands, commits, issue links and timestamps. Engineer cannot close; orchestrator coordinates without substituting implementation claims for QA.

Part II explicitly requires QA to close verified `mvp` and `user-test-bug` issues, overriding the first article's orchestrator closure. The full-stack article connects frontend to the in-memory backend earlier; the user's mandatory sequence instead requires persistent SQLite before final integration. Follow the user's sequence and disclose this deliberate deviation. Do not silently claim exact source reproduction.

Real user-test defects require actual `user-test-bug` issues initially containing Goal/Description, reproduction, expected/actual; PM grooms, QA adds regression cases, engineer fixes and QA independently retests/closes. Never manufacture bugs or arbitrary issues. Labels: mvp, post-mvp, user-test-bug. Deadline 2026-10-20 14:20 UTC+5; actual remote events determine compliance.
