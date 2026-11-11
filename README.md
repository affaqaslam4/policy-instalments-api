# policy-instalments-api

[![CI](https://github.com/affaqaslam4/policy-instalments-api/actions/workflows/ci.yml/badge.svg)](https://github.com/affaqaslam4/policy-instalments-api/actions/workflows/ci.yml)

A small insurance service that creates policies, splits the premium into an instalment schedule and records
payments against it. GraphQL API on .NET 9 with Hot Chocolate, MongoDB for storage, a React + TypeScript front end
with Apollo Client, and Docker for running it all.

## What it does

- **Creates a policy** and builds its instalment schedule (monthly, quarterly, semi-annual or annual, 1–12 instalments).
- **Rounds to the cent without losing money.** 1,000.00 over 3 instalments is 333.34 + 333.33 + 333.33. The remainder
  always goes on the first instalment, so the schedule adds up to the exact premium.
- **Handles month ends.** A policy starting on 31 January is due next on 28 February, then 31 March.
- **Records payments**, enforcing the rules: instalments are paid in order, an instalment can't be paid twice, and the
  amount must match.
- **Lists overdue instalments** for any date.
- **Rejects duplicate policy numbers** with a unique index in MongoDB.
- **Reports on the portfolio**: totals per currency (never added across currencies), collections expected over the
  next six months, and overdue instalments by age.

## Front end

React 19 + TypeScript (Vite), Apollo Client, React Router, AG Grid and Recharts.

- **Dashboard**: tiles for policies, written premium, collected and overdue; a donut for collection status; a bar
  chart of expected collections for the next 6 months; overdue amounts by age (1–30, 31–60, 61–90, 90+ days); and
  a list of overdue instalments. A currency switch shows one currency at a time.
- **Policies**: a sortable, filterable AG Grid of all policies with collected and outstanding amounts.
- **New policy**: a form with instant validation that mirrors the server rules, and a preview of the split
  ("First payment $3,333.34, then 2 × $3,333.33"). The server still enforces every rule.
- **Policy page**: details, a progress bar, and an instalment grid with Paid / Due / Overdue badges. Only the next
  unpaid instalment can be paid, matching the domain rule. Paying updates the page through Apollo's normalised cache,
  and any rule the server rejects is shown in the dialog.

## Stack

.NET 9 · C# · Hot Chocolate 15 (GraphQL) · MongoDB 8 · React 19 · TypeScript · Apollo Client · AG Grid · Recharts ·
xUnit · Vitest · Testing Library · Testcontainers · Docker · nginx · GitHub Actions

## Project layout

```
src/
  PolicyInstalments.Domain/   Policy aggregate, instalment schedule, business rules. No framework dependencies.
  PolicyInstalments.Api/      GraphQL schema (Hot Chocolate), MongoDB repository, composition root.
tests/
  PolicyInstalments.Domain.Tests/           Unit tests for the rules (written before the code).
  PolicyInstalments.Api.IntegrationTests/   GraphQL tests against a real MongoDB started by Testcontainers.
web/
  src/pages/       Dashboard, policies grid, create form, policy page.
  src/lib/         GraphQL documents and types, formatting, form rules, report shaping (all unit tested).
  scripts/seed.mjs Loads demo policies through the API.
```

## Run it

With Docker only:

```bash
docker compose up --build
```

- App: http://localhost:3000 (nginx serves the React build and proxies `/graphql` to the API)
- GraphQL IDE: http://localhost:8080/graphql
- Health check: http://localhost:8080/health

Load demo data (11 policies across USD, EUR and GBP, with paid, overdue and upcoming instalments):

```bash
cd web && npm install && npm run seed
```

Front-end development with hot reload (API running on :8080):

```bash
cd web && npm run dev
```

Run the tests (Docker must be running for the integration tests):

```bash
dotnet test PolicyInstalments.slnx
cd web && npm test
```

## Example

```graphql
mutation {
  createPolicy(input: {
    policyNumber: "POL-1001"
    insuredName: "Northwind Shipping"
    currency: "USD"
    totalPremium: 1000
    inceptionDate: "2026-01-31"
    frequency: MONTHLY
    numberOfInstalments: 3
  }) {
    policy { id outstanding instalments { number dueDate amount status } }
  }
}
```

```graphql
mutation {
  payInstalment(input: { policyId: "<id>", instalmentNumber: 1, amount: 333.34, paidOn: "2026-01-31" }) {
    policy { amountPaid outstanding }
  }
}
```

```graphql
{
  policies {
    policyNumber
    outstanding
    overdueInstalments(date: "2026-03-15") { number dueDate amount }
  }
}
```

If a business rule is broken, the API returns a normal GraphQL error with the code `DOMAIN_RULE_VIOLATION` and a
readable message, for example "Instalments must be paid in order; an earlier instalment is still pending."

## Design notes

- **The domain knows nothing about storage or GraphQL.** `Policy` is the aggregate root: instalments only change
  through it, so its rules can't be bypassed. The MongoDB repository maps to a separate `PolicyDocument`, so BSON
  details (Decimal128, UTC dates) stay out of the domain.
- **Money is `decimal` and is stored as `Decimal128`.** It is never stored as a double.
- **Read-only schema.** `PolicyType` hides the domain's state-changing methods, so a query can't change data. All
  writes go through mutations.
- **Docker image.** A multi-stage build restores in a cached layer, publishes in the SDK image, and runs on the
  ASP.NET runtime image as a non-root user.
- **Front end.** Pages are lazy-loaded, so the charts and the grid download only when needed, and only the AG Grid
  modules in use are registered. Validation and the schedule preview are pure functions, unit tested without a
  browser. Status badges use an icon and a label, never colour alone.
- **CI.** Every push and pull request builds the code and runs all tests, including the Testcontainers ones, on
  GitHub's Docker-enabled runners, and lints, tests and builds the front end. Pushes to `main` then publish both
  images to GitHub Container Registry (`ghcr.io/affaqaslam4/policy-instalments-api` and `-web`).

## Possible next steps

- Optimistic concurrency (a version field on the policy) for simultaneous payments.
- Partial payments and refunds.
- Authentication with role-based access for underwriters and finance users.
