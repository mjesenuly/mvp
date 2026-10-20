# RepairLens

RepairLens compares structured equipment repair offers and tracks customer-approved repairs. English UI; prices in KZT. Customers create private requests, approved workshops quote, and the customer chooses and confirms completion. Accepted terms and activity history are preserved. Unknown fees are never presented as zero.

## Requirements and download

Install **Node.js 24 LTS** (includes npm) and optionally Git. Clone:

```sh
git clone https://github.com/mjesenuly/mvp.git
cd mvp
```

Alternatively open the repository, choose **Code → Download ZIP**, extract it, and open the extracted project folder. In Windows File Explorer open that folder, click its address bar, type `cmd` and press Enter. For PowerShell, right-click inside the folder and choose **Open in Terminal**. Confirm `package.json` is in the current folder before running commands.

```sh
node --version
npm ci
npm run build
```

## Real SQLite application on Windows

Run exactly one server against one database file. Choose **one** terminal syntax below. Replace placeholders with your own local admin credentials; the password needs at least 10 characters. Do not commit credentials. Do not set `NODE_ENV=production` for this local HTTP setup, since production cookies require HTTPS.

CMD:

```bat
set STORAGE=sqlite
set DATABASE_FILE=.data/repairlens.sqlite
set ADMIN_EMAIL=YOUR_ADMIN_EMAIL
set ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_AT_LEAST_10_CHARACTERS
npm run migrate
npm start
```

PowerShell:

```powershell
$env:STORAGE="sqlite"
$env:DATABASE_FILE=".data/repairlens.sqlite"
$env:ADMIN_EMAIL="YOUR_ADMIN_EMAIL"
$env:ADMIN_PASSWORD="YOUR_ADMIN_PASSWORD_AT_LEAST_10_CHARACTERS"
npm run migrate
npm start
```

Open **http://localhost:3000** on the computer running the server. Stop with Ctrl+C. To restart, reopen a terminal inside the project, set the same variables, and run `npm start`. SQLite data, sessions and approvals persist in `.data/repairlens.sqlite`. For a backup, stop the server and copy that file to a private location. It contains account hashes, contacts and private photos: never publish it.

An optional `.env` can hold the same settings; copy `.env.example` to `.env` and replace placeholders. `.env` is ignored by Git. Environment variables take precedence. Normal startup without `STORAGE=sqlite` uses **in-memory storage**, which resets on restart; use SQLite for the assignment demonstration.

The admin is seeded only when the saved application state is initially empty. Set admin credentials before the first server start. Changing those variables later does not change an existing admin password. Running migrations alone does not seed an account.

## Accounts and demonstration

Real mode has no public admin signup or prefilled customer passwords. Sign in with your seeded admin. In another session/browser, create customer and workshop accounts through **Create account**. The admin approves the workshop, then the workshop uses **Check approval status** or Refresh. Customers create requests; workshops submit/edit/withdraw offers; customers compare and choose. The selected workshop may propose revised terms; customer approval is required before work. Workshop starts repair and marks it ready; customer confirms completion. Only the owner cancels before repair starts. Use Refresh when another account has changed data.

For a separate fictional preview open `http://localhost:3000/?mode=mock`. Its banner clearly says mock; it resets on refresh. Preview accounts are `customer@example.test`, `workshop@example.test`, `admin@example.test`, all using `DemoPass123!`. These are fictional preview credentials, **not real database accounts**. API failures never switch to mock mode.

## Development and verification

After starting the SQLite API, a second terminal can run `npm run dev` and open `http://localhost:5173`; Vite proxies `/api` to port 3000. For the simplest demonstration use the built application at port 3000.

```sh
npm run check:contract
npm run build
npm test
npm run test:api
npm run test:storage
npm run test:parity
```

`npm test` includes domain, DOM, transport unit tests and a real HTTP/SQLite frontend-adapter integration test. DOM tests are not browser visual tests. API tests exercise memory storage; parity reruns the same HTTP cases with SQLite. Storage tests verify migrations, rollback and restart durability. GitHub Actions defines this command sequence on Node 24; a checked-in workflow alone does not prove a successful remote run.

## Documentation and limits

- [Product scope and permissions](_docs/plan.md)
- [Architecture](_docs/architecture.md), [persistent storage](_docs/storage.md)
- [Genuine brainstorming](chat-brainstorm.md), [API contract](openapi.yml)
- [Iteration history](_docs/iteration-log.md), [canonical issue index](_docs/tasks.md)
- [Engineering integration evidence](_docs/engineer-05.md), [independent integration QA](_docs/qa-05.md)

SQLite via SQL.js is a bounded, single-process coursework implementation with whole-state transactions, not a multi-instance marketplace. No payments, chat, email recovery, or deployment is included. A server running in an agent workspace is not a public website accessible from your computer. Run these commands locally. Historical links may use `repairlens`; GitHub currently redirects that repository to `mvp`.
