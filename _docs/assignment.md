# Complete My Part II AI-Native Full-Stack Assignment — RepairLens

You are my product manager, software architect, UI/UX designer, development orchestrator, software engineer, and QA engineer.

Help me complete my university assignment by building **RepairLens**, a non-trivial full-stack application for comparing equipment repair offers and tracking the repair process.

**Start with genuine product brainstorming. Do not immediately generate code or assume that all proposed features are approved.**

Discuss requirements with me in Russian. Write the application interface, code documentation, specifications, GitHub Issues, and README in English.

## 1. Assignment and sources

My Part I project was **Tournament Tracker**, a university football tournament management application. RepairLens must be a separate project with its own repository and genuine development history.

Read these sources before deciding the workflow:

1. https://aishippingblog.com/p/ai-native-development-specifications
2. https://aishippingblog.com/p/build-and-ship-a-full-stack-app-with

Review the videos and repository examples referenced by the articles when accessible.

Extract the actual workflow, document names, role definitions, issue structure, and implementation practices. Distinguish source requirements from my assignment requirements and your recommendations.

If a source or video is inaccessible, state exactly what you could not review. Do not claim that you watched or read unavailable material.

### Mandatory assignment requirements

- Use real GitHub Issues as the canonical backlog.
- Use a distinctive design agent such as Lovable, v0, or Claude Design when available, or provide concrete, relevant design references.
- Use persistent SQLite storage.
- Use a database-agnostic ORM and migrations.
- Develop in this order:
  1. Frontend with a mock service.
  2. `openapi.yml` defining the API contract.
  3. Backend with in-memory storage.
  4. Backend with SQLite through an ORM.
  5. Connect the frontend to the real backend.
  6. Run, test, repair, and verify the complete application.
- Keep project Markdown documentation in the repository and update it during development.
- Include genuine pre-implementation brainstorming history as a `.md` file.
- Actually run and thoroughly test the application.
- Use GitHub labels `mvp`, `post-mvp`, and `user-test-bug`.
- QA must close completed issues labelled `mvp` and `user-test-bug` before the deadline.
- Do not create an arbitrary number of issues merely to inflate the backlog. Decompose work into meaningful, reviewable tasks.

Ask for the exact deadline, timezone, and intended GitHub account before creating external project resources. Never reuse an account from an unrelated project without checking.

## 2. Product idea

### RepairLens

RepairLens helps customers compare repair offers from workshops using consistent information rather than headline prices alone.

For example:

- Workshop A offers a repair for 25,000 KZT, including parts and a warranty.
- Workshop B offers 18,000 KZT for labour, with parts charged separately.

RepairLens should make this difference visible.

Customers submit repair requests. Workshops submit structured offers. Customers compare the offers, choose a workshop, and follow repair progress.

### Target users

- Customers seeking repairs.
- Repair workshops responding to requests.

### Proposed initial categories

- Smartphones.
- Laptops.
- Washing machines.

These are proposed MVP boundaries, subject to our brainstorming.

### Product principles

- Show what each quoted price includes.
- Distinguish a fixed total from an estimate with unknown charges.
- Do not treat missing prices as zero.
- Preserve accepted commercial terms.
- Make workflow status and permitted next actions clear.
- Do not claim to know the “fair market price” without credible supporting data.

## 3. Begin with a real product interview

Ask **one short, meaningful question at a time**, with two or three options when helpful. Recommend an option and explain the practical trade-off briefly.

The idea is already selected. Do not brainstorm unrelated applications.

Clarify decisions including:

- Whether users can be customers, workshops, or both.
- Authentication and workshop registration.
- Whether workshop approval is needed.
- Which request details workshops may see.
- Whether requests are public or restricted.
- Required device and fault information.
- Whether photos are necessary for the MVP.
- Offer fields and treatment of uncertain costs.
- Whether offers can be edited or withdrawn.
- How customers compare and accept offers.
- Who may change each repair status.
- Cancellation and completion rules.
- Whether customer confirmation is required to finish a repair.
- What activity history is visible.
- Which features are essential for the demonstration.

Use reasonable defaults for routine implementation details. Ask me about decisions that materially change the product, permissions, or scope.

Save genuine questions and my actual answers in `chat-brainstorm.md`. Clearly distinguish:

- Verbatim conversation.
- Summaries.
- Proposed defaults.
- Confirmed decisions.
- Unresolved questions.

Never invent my answers or retrospectively fabricate brainstorming.

Before implementation, present a compact agreed MVP and its success criteria.

## 4. Proposed MVP

Discuss and refine the following scope.

### Customer account

Customers can:

- Create and view their repair requests.
- View offers received for their requests.
- Compare offers.
- Accept one eligible offer.
- Follow repair progress.
- Perform cancellation or completion actions according to the agreed rules.

### Workshop account

Workshops can:

- Maintain a basic workshop profile.
- Browse eligible requests.
- Submit structured offers.
- Edit or withdraw offers when permitted.
- View accepted jobs.
- Update permitted repair stages.

### Repair request

Potential fields:

- Device category.
- Brand and model.
- Fault description.
- City.
- Creation date.
- Current status.

Collect only information justified by the MVP.

### Structured repair offer

Potential fields:

- Diagnosis or proposed work.
- Diagnostic fee.
- Labour cost.
- Parts cost.
- Delivery or collection cost.
- Estimated turnaround time.
- Warranty duration.
- Exclusions and conditions.
- Whether the quote is fixed or estimated.

Define which fees are included, additional, optional, or unknown so the calculation does not double-count costs.

### Offer comparison

Compare offers for the same request using:

- Known total cost.
- Unknown or excluded charges.
- Turnaround time.
- Warranty.
- Scope of work.
- Workshop information.

Do not automatically present the cheapest offer as the best offer.

### Offer acceptance

Define and implement these invariants:

- A request can have at most one accepted offer.
- Only the request owner can accept it.
- Withdrawn or otherwise ineligible offers cannot be accepted.
- Concurrent acceptance attempts cannot produce two winners.
- Accepted offer terms cannot silently change.
- Other offers become unavailable for acceptance according to the agreed lifecycle.

### Repair workflow

A proposed lifecycle is:

`Open → Offer accepted → In repair → Awaiting customer confirmation → Completed`

Cancellation rules and final status names must be agreed during discovery.

Document legal transitions, authorized actors, and invalid actions before implementation.

### Activity history

Record meaningful events such as:

- Request creation.
- Offer submission or revision.
- Offer acceptance.
- Repair status changes.
- Cancellation.
- Completion.

Generate timestamps on the server and protect history from ordinary user editing.

### Initially outside MVP

Unless explicitly approved, exclude:

- Payments and escrow.
- Real-time chat.
- Maps and geolocation.
- AI diagnosis.
- Unsupported “fair price” predictions.
- Complex reputation systems.
- Native mobile applications.
- Paid APIs.

## 5. Architecture

After the product scope is agreed, propose a small number of suitable stacks and explain the trade-offs.

A reasonable starting option is:

- React, TypeScript, and Vite.
- A lightweight TypeScript backend.
- SQLite.
- A database-agnostic ORM such as Prisma or another justified option.
- OpenAPI.
- Meaningful automated domain, API, and frontend tests.

Do not finalize the ORM solely because SQLite is supported. Explain how business logic remains separate from database-specific details.

Keep the project easy to run without paid services.

Define:

- Domain models and relationships.
- Role and ownership permissions.
- Input validation.
- Money representation and currency.
- Offer calculations.
- State transitions.
- Error responses.
- Persistence and migrations.
- Authentication and session handling.
- Test strategy.

Keep secrets out of source control and client bundles. Use environment examples containing placeholders only.

## 6. Required implementation iterations

Do not jump directly to the final database-backed application. Preserve real commits and verification evidence for each iteration.

### Iteration 1 — Frontend with mock service

Build the approved interface using an explicit mock service.

- Keep components independent of the data implementation.
- Model asynchronous operations.
- Include loading, empty, success, validation, and error states.
- Use fictional demonstration data, clearly identified.
- Implement meaningful interactions rather than decorative buttons.
- Define TypeScript domain types and the service interface.

Verify the frontend before moving on.

### Iteration 2 — OpenAPI contract

Create `openapi.yml` from the approved product and frontend service needs, before backend implementation.

Specify:

- Endpoints.
- Request and response schemas.
- Authentication.
- Permissions.
- Status codes.
- Validation errors.
- Pagination or filters where required.
- Money and date formats.
- Examples.
- Conflict responses for invalid transitions or competing acceptance attempts.

Review inconsistencies before implementation. Record subsequent contract changes.

### Iteration 3 — In-memory backend

Implement the OpenAPI contract using an in-memory repository.

- Enforce permissions and business rules server-side.
- Keep domain logic independent of storage.
- Test API behaviour and contract conformance.
- Explicitly document that data resets on restart in this iteration.

### Iteration 4 — SQLite through an ORM

Replace the in-memory repository with a SQLite-backed implementation.

- Use ORM models and versioned migrations.
- Keep the frontend-facing contract stable.
- Preserve domain behaviour.
- Use transactions and database constraints for critical invariants.
- Verify restart persistence.
- Run a shared repository or behavioural test suite against both storage implementations where practical.

### Iteration 5 — Frontend/backend integration

Connect the existing frontend service interface to the real API.

- Avoid rewriting UI components around database details.
- Handle authentication, authorization, errors, and conflicts.
- Verify complete customer and workshop journeys.
- Keep mock mode explicitly separate from normal operation.

### Iteration 6 — User testing and repair

Run the application and test it thoroughly.

For every actual bug discovered during user testing:

1. Create a real GitHub Issue labelled `user-test-bug`.
2. Initially describe the observed problem using **Goal** and **Description**.
3. Include reproduction steps, expected behaviour, and actual behaviour.
4. Ask the PM agent to groom the issue.
5. Ask the QA agent to add relevant regression cases.
6. Have the engineer implement the fix.
7. Have QA independently retest it.
8. QA closes it only after PASS.

Never introduce or fabricate bugs to create assignment evidence.

## 7. Design direction

Use a professional repair-service comparison interface.

Suggested direction:

- English interface.
- Neutral backgrounds.
- Restrained blue accents.
- Readable typography.
- Clear cost breakdowns.
- Useful comparison tables.
- Accessible forms.
- Responsive layouts.
- Clear status badges.
- Limited decorative elements.

Avoid a generic dashboard consisting only of interchangeable cards.

When a design agent is available, use it and preserve the actual output or handoff. Otherwise, select concrete relevant design references, explain which patterns they inform, and document them in `_docs/design-references.md`.

Do not claim to have used Lovable, v0, Claude Design, or another agent unless you actually used it.

## 8. Documentation and agent roles

Use the document names and locations established by the reviewed sources. Add assignment-specific documents where needed.

Documentation should cover:

- Genuine brainstorming.
- Product scope.
- Architecture.
- Domain and permission rules.
- Development process.
- Role definitions.
- Issue template.
- Design references and design system.
- Testing guidance.
- Iteration history.
- Setup and execution.
- Actual verification results.
- Known limitations.

Include `AGENTS.md` and the applicable PM, engineer, and QA role files.

If the source uses different role paths, preserve them. A `qa.md` file may point to the canonical QA role if necessary; avoid contradictory duplicate instructions.

### Role responsibilities

**PM**

- Grooms real issues.
- Makes acceptance criteria checkable.
- Identifies edge cases and scope boundaries.
- Updates specifications.
- Does not implement production code.

**Software engineer**

- Implements one groomed issue at a time.
- Writes relevant tests.
- Records actual commands and results.
- Commits work and links it to the issue.
- Does not close the issue.

**QA engineer**

- Independently checks every acceptance criterion.
- Tests the running application and relevant edge cases.
- Adds regression cases for reported bugs.
- Posts PASS or FAIL with evidence.
- Returns failures to the engineer.
- **Closes verified `mvp` and `user-test-bug` issues**, as required by this assignment.

**Orchestrator**

- Coordinates the roles and handoffs.
- Keeps work progressing.
- Ensures specifications, implementation, and evidence remain consistent.
- Does not substitute its own implementation claim for independent QA.

If an article assigns closure differently, explicitly document that my Part II assignment requires QA to close these issues.

Use actual separate agents when available. Otherwise, clearly explain the limitation and preserve distinct role handoffs without inventing agent executions.

## 9. GitHub workflow

Create a separate RepairLens repository under the verified account.

Use these labels:

- `mvp`
- `post-mvp`
- `user-test-bug`

Every implementation issue should contain:

- Goal.
- Description or background.
- Checkable acceptance criteria.
- Out of scope.
- Constraints.
- Dependencies.
- Testing requirements.

Use real issues, real commits, and actual links. Do not claim that local Markdown files are GitHub Issues.

After issue creation, GitHub is the canonical active backlog.

Follow a sequential lifecycle:

1. Select an open issue.
2. PM grooms it.
3. Engineer implements it.
4. QA verifies it.
5. On FAIL, return to the engineer.
6. On PASS, QA closes it.
7. Continue to the next issue.

If a platform approval blocks publishing, commenting, pushing, or closing issues, prepare the concrete work first and request the specific required authorization. Do not repeatedly ask for permission already granted.

This prompt authorizes ordinary project repository work, including creating the repository, publishing non-secret project files, creating and grooming issues, posting development/QA reports, and QA closing verified issues. Platform-required approvals still apply.

## 10. Testing expectations

At minimum, verify:

- Valid and invalid repair requests.
- Authentication and role permissions.
- Ownership restrictions.
- Offer submission, editing, and withdrawal.
- Cost calculation, optional charges, and unknown prices.
- One accepted offer per request.
- Concurrent or repeated acceptance.
- Preservation of accepted terms.
- Legal and illegal status transitions.
- Cancellation rules.
- Activity history.
- Persistence after restart.
- Frontend loading, empty, error, and conflict states.
- Complete customer and workshop workflows.

Use browser testing when available and appropriate. Clearly distinguish:

- Unit tests.
- API integration tests.
- DOM component tests.
- Actual browser interaction tests.
- Visual inspection.

Do not describe DOM tests as browser visual testing.

Never claim tests passed unless they ran.

## 11. Running and final delivery

Actually install, build, start, and test the application.

Provide:

- Public GitHub repository URL.
- Genuine `chat-brainstorm.md`.
- All relevant project Markdown files.
- `openapi.yml`.
- Source code.
- ORM schema and migrations.
- Automated tests.
- Meaningful iteration history.
- Real labelled issues and QA handoffs.
- Screenshots when actually captured.
- Exact setup and run instructions.
- Final test results.
- Known limitations.

Make local setup beginner-friendly. Include:

- Required Node.js version.
- How to download or clone the repository.
- How to open a terminal **inside the project folder**.
- Separate CMD and PowerShell environment-variable syntax.
- Database initialization.
- Demo account instructions where applicable.
- The local application URL.

Do not present a server running only inside your workspace as a website accessible from my computer.

A deployment is additional work unless needed or requested. Do not silently replace the full-stack application with a static mockup.

Before declaring completion, verify that:

- All approved MVP functionality works.
- The required implementation iterations actually occurred.
- Documentation matches the implementation.
- All `mvp` and `user-test-bug` issues have QA PASS and are closed before the deadline.
- Source and documentation are published.
- No unresolved blocker is hidden.

Never fabricate conversations, interviews, design-agent usage, test results, issues, commits, timestamps, or live integration success.

## Your first response

Briefly acknowledge RepairLens and its proposed purpose.

Ask for the exact deadline, timezone, and intended GitHub account as setup details. Then ask only the first product-discovery question.

Do not start coding yet. Continue with one product question at a time until we have a sufficiently clear MVP.
