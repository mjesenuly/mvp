# Mock service to REST contract mapping

The frontend `RepairService.load()` maps to `GET /api/session`; `act()` maps to the REST operation with the same operationId. Register/login/logout use `/api/auth/*`; approval uses the workshop admin route; creation/listing use `/api/requests`; offer and lifecycle methods use explicit request action routes. The `withdraw` method uses DELETE, not a JSON command endpoint. `photo` and `health` are server transport operations in addition to frontend mutations.

The server snapshot adds `csrfToken` for the adapter to retain and send as `X-CSRF-Token`; React needs only the original Snapshot fields. Session IDs stay in opaque HttpOnly cookies, never JSON. Login/register are public operations with origin checks; authenticated mutations require CSRF. No public admin registration exists.

Mock photo IDs are provisional and URLs are data URIs. Real uploads accept a limited data URI payload, validate decoded size/signature, replace all IDs with server-generated IDs, and return protected `/api/photos/{id}` URLs. These photos are never served from public static directories. The same max-three optional photos and 3 MiB each apply.

Money is integer KZT minor units; null unknown differs from zero; optional fees are separate. Fixed required fees cannot be unknown. Requests and offers use role/ownership projections, including commercial history redaction for competing workshops.

Immutable quote versions are preserved as complete Terms snapshots in append-only timestamped activity entries. Entry representation is an ISO 8601 UTC timestamp, actor, action and serialized snapshot where relevant. `accepted` is the current accepted projection; earlier terms persist in history, not overwritten when revisions are accepted. The contract documents this compact aggregate representation explicitly rather than claiming a separate relational version table.

Iteration 2 changes only contract/docs and validation. Backend enforcement, storage and real adapter are later iterations. Contract validation checks schema references, operation uniqueness, path parameters and CSRF declarations; independent QA may add standards validation.
