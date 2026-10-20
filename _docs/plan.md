# RepairLens product specification

## Status and provenance

Original assignment: `assignment.md`. Confirmed requirements below are summarized from the orchestrator's genuine discovery handoff, not reconstructed user quotations. Exact transcript supplied by the orchestrator is preserved in `../chat-brainstorm.md`. Deadline: 2026-10-20 14:20 UTC+5 / 09:20 UTC. User explicitly confirmed mjesenuly, then signed in. Browser verified mjesenuly and the public repository https://github.com/mjesenuly/repairlens was created.

## Goal and approved scope

Customers compare transparent repair offers for smartphones, laptops and washing machines, select a workshop and track repair completion. Separate customer and workshop accounts use email/password. A server-seeded admin manually approves workshops; there is no public admin signup. Requests are visible to their customer owner and approved workshops only. Customer contact details are immediately visible to approved workshops. Workshops see their own offers but never competitors' quotes. Customers see all offers for their own request.

Requests contain category, brand/model, fault description, city and optional photos. Technical default: maximum three photos, each 3 MB, validated by actual file type with authorized retrieval. This is an implementation safeguard, not a quoted user answer.

Offers include proposed work, fixed/estimated type, explicit fee components, turnaround, warranty and exclusions. Unknown charges remain unknown rather than zero. Fixed offers must have complete required pricing. Estimated known subtotal must visibly disclose remaining uncertainty. Optional charges are separate and never silently counted twice. Currency is KZT; integer minor units are the storage/contract default.

Each workshop has at most one active offer per request; it may edit or withdraw before selection. Only owner accepts an eligible offer, at most one winner even under concurrent/repeated actions. Acceptance freezes immutable terms. Competing offers become unavailable for selection. Selected workshop may propose revised terms; customer must accept before work begins. Rejection cancels the whole request. Previous versions remain in immutable history. No silent quote overwrite.

Lifecycle: Open → Offer accepted → In repair → Ready for customer confirmation → Completed. Owner may cancel only before In repair. Selected workshop starts repair only with accepted current terms and no pending revision, then marks ready. Only customer owner confirms completion. Any unauthorized or illegal transition fails without mutation. Terminal requests cannot reopen. Server timestamps and immutable activity events record actor and changes.

## Permissions

Anonymous visitors may register/login but cannot browse private requests or photos. Customers access only their own requests/offers/history. Approved workshops browse eligible requests and contacts, submit their own offers and manage selected jobs; pending/rejected workshops cannot do so. Admin approves workshop accounts, without gaining an undocumented public signup path. Apply explicit projections and ownership checks at every server endpoint including photo downloads.

## Invariants

- One selected offer per request, enforced transactionally; repeats/conflicts cannot produce two winners.
- One active offer per workshop/request, including concurrent submissions.
- Immutable accepted/revised quote versions; work requires the current accepted revision.
- Pending revision blocks start; customer rejection cancels whole request.
- Workshop competitors' fees remain private even for guessed offer IDs.
- Cancellation only by owner before repair; completion only owner after workshop ready.
- Money accepts nonnegative integer minor units; missing/null unknown differs from zero.
- Photo count/size/actual MIME checks and authorization apply independently of UI.

## Success criteria and scope boundaries

Demonstrate registration, admin approval, private request/photos, competing offers, owner comparison/selection, revision acceptance/rejection, repair/ready/customer completion and cancellation; verify permission/conflict failures and durable restart. UI is English, light neutral with restrained blue. No payments, chat, reviews, map, AI diagnosis or fair-market-price claims. No deployment claim unless actually performed. Six meaningful sequential issues reflect mandatory iterations, not backlog inflation.
