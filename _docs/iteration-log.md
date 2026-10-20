# Actual iteration log

GitHub is canonical; local iteration numbers differ from issue numbers because genuine bug #2 was added. QA reported remote UI closure times below; Vitest's displayed clock offset is not used for deadline evidence. Strictly finish prior issue through QA PASS/closure before next implementation.

| Iteration | Actual issue | Deliverable | Actual local commits | Independent QA | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | [#1](https://github.com/mjesenuly/repairlens/issues/1) | Frontend mock | 74d0003 initial; b65a34e privacy repair | 08b97cc, qa-01.md; original probe FAIL then regression PASS, 7 tests/build PASS | QA closed 13:28 UTC+5 |
| Bug | [#2](https://github.com/mjesenuly/repairlens/issues/2) | Competitor quote projection | b65a34e | PM grooming comment 6286781146; QA independent original reproduction/retest | QA closed 13:29 UTC+5 |
| 2 | [#3](https://github.com/mjesenuly/repairlens/issues/3) | OpenAPI contract | 12080ad; ce39fab documentation | a6782d8, qa-02.md; 19-operation check and SwaggerParser 13.1.0 OpenAPI 3.1 validation PASS | QA closed 13:32 UTC+5 |
| 3 | [#4](https://github.com/mjesenuly/repairlens/issues/4) | In-memory API | 9ae2985 | 5a67153, qa-03.md; 4 HTTP tests, 7 DOM/domain, build/contract and independent API probe PASS | QA closed 13:37 UTC+5 |
| 4 | [#5](https://github.com/mjesenuly/repairlens/issues/5) | TypeORM SQLite | Not yet recorded | Not yet recorded | Published, pending |
| 5 | [#6](https://github.com/mjesenuly/repairlens/issues/6) | Real integration | Not yet recorded | Not yet recorded | Published, pending |
| 6 | [#7](https://github.com/mjesenuly/repairlens/issues/7) | Running user tests/CI/setup | Not yet recorded | Not yet recorded | Published, pending |

Deferred issue [#8](https://github.com/mjesenuly/repairlens/issues/8) is labelled post-mvp: evaluate password recovery/email verification; not approved for implementation in current scope. Labels mvp, post-mvp and user-test-bug exist. No future PASS or closure is claimed here.

Local development hashes in this log are not asserted to exist as remote commits. Source is published through GitHub UI uploads, which create different publication commits. Actual remote publication links must be recorded separately by the orchestrator.
