# Canonical backlog index

Actual GitHub Issues are canonical. This index records observed handoff status, not future completion; actual remote issue events are authoritative. Local numbered specs correspond to iteration number, which differs from issue number because a genuine bug was inserted.

| Actual issue | Label | Iteration/specification | Observed status |
| --- | --- | --- | --- |
| [1 Frontend mock](https://github.com/mjesenuly/repairlens/issues/1) | mvp | 1 / issues/01.md | QA PASS, closed 13:28 UTC+5 |
| [2 Quote privacy bug](https://github.com/mjesenuly/repairlens/issues/2) | user-test-bug | Real stage1 defect | PM groomed, independently retested PASS; QA closed 13:29 |
| [3 OpenAPI](https://github.com/mjesenuly/repairlens/issues/3) | mvp | 2 / issues/02.md | QA PASS, closed 13:32 |
| [4 In-memory API](https://github.com/mjesenuly/repairlens/issues/4) | mvp | 3 / issues/03.md | QA PASS, closed 13:37 |
| [5 TypeORM SQLite](https://github.com/mjesenuly/repairlens/issues/5) | mvp | 4 / issues/04.md | QA PASS, closed 13:42 |
| [6 Real integration](https://github.com/mjesenuly/repairlens/issues/6) | mvp | 5 / issues/05.md | QA PASS; remote closure relayed by orchestrator at 14:18 UTC+5 |
| [7 User testing/CI/setup](https://github.com/mjesenuly/repairlens/issues/7) | mvp | 6 / issues/06.md | Engineering handoff prepared after #6 remote closure; final QA/publication pending |
| [8 Recovery/email verification](https://github.com/mjesenuly/repairlens/issues/8) | post-mvp | Deferred proposal | Open, outside approved current implementation |

See iteration-log.md and qa-01.md through qa-04.md for actual local commits and independent evidence. The PM posted engineer evidence relays on closed #1/#3 without changing issue status. QA alone closes verified MVP and user-test-bug work. Publication uses UI-upload commits; original local hashes are not claimed to exist remotely.
