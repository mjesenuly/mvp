# Independent QA test plan

Prepared before implementation review. This is a plan, not execution evidence.

| Area | Positive case | Negative or regression case |
| --- | --- | --- |
| Auth and roles | Customer/workshop registration, seeded admin approval | Public admin signup denied; pending workshop cannot browse |
| Request privacy | Owner and approved workshop see request/contact | Anonymous and another customer denied, including photo IDs |
| Photos | Valid permitted image accepted and retrievable | Too many, oversized, invalid signature and unauthorized download |
| Prices | Explicit zero, unknown, fixed and estimated costs | Unknown never shown as zero; invalid integer or negative values denied |
| Offers | Create/edit/withdraw before selection | Duplicate active offer denied; competitor fees absent |
| Selection | Owner accepts one offer | Wrong owner, repeat and competing acceptance cannot select two winners |
| Revision | Selected workshop proposes; owner accepts | Pending revision blocks work; reject cancels; old terms retained |
| Lifecycle | Start → ready → owner completion | Wrong actor, skip stage and cancellation after start denied |
| Storage | SQLite restart restores complete workflow | Empty migrations and reruns safe; failed mutation leaves state intact |
| UI | Role actions, loading, empty and error recovery | Expired session, validation and conflict feedback |

Each iteration receives a separate report with exact commands, observed results,
criterion decisions and limitations. DOM testing is not browser visual testing.
Defects receive real GitHub `user-test-bug` issues with Goal/Description,
reproduction, expected/actual, PM grooming and QA regression cases. QA never
fixes engineer code and closes only verified PASS issues.
