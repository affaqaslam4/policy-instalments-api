// Loads demo policies through the GraphQL API so the dashboard has something to show.
// Dates are relative to today, so there is always a mix of paid, overdue and upcoming instalments.
// Usage: npm run seed            (API at http://localhost:8080)
//        API_URL=http://host:port npm run seed

const api = `${process.env.API_URL ?? 'http://localhost:8080'}/graphql`

async function gql(query, variables) {
  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json()
  if (body.errors) throw new Error(body.errors.map((e) => e.message).join('; '))
  return body.data
}

const iso = (d) => d.toISOString().slice(0, 10)
function monthsAgo(n, day = 1) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, day))
}

// [number, insured, currency, premium, startedMonthsAgo, frequency, instalments, instalmentsPaid]
const policies = [
  ['MAR-24001', 'Northwind Shipping', 'USD', 120000, 7, 'MONTHLY', 12, 7],
  ['MAR-24002', 'Contoso Marine Ltd', 'USD', 84500, 5, 'MONTHLY', 12, 3],
  ['PRP-24003', 'Fabrikam Logistics', 'USD', 48000, 9, 'QUARTERLY', 4, 2],
  ['ENG-24004', 'Adventure Works Energy', 'USD', 250000, 4, 'MONTHLY', 10, 1],
  ['CAS-24005', 'Tailspin Airlines', 'USD', 36000, 2, 'MONTHLY', 6, 2],
  ['PRP-24006', 'Woodgrove Retail', 'USD', 18000, 11, 'SEMI_ANNUAL', 2, 1],
  ['MAR-24007', 'Litware Cargo GmbH', 'EUR', 96000, 6, 'MONTHLY', 12, 6],
  ['ENG-24008', 'Proseware Wind AG', 'EUR', 150000, 8, 'QUARTERLY', 4, 1],
  ['CAS-24009', 'Alpine Ski House', 'EUR', 24000, 3, 'MONTHLY', 12, 1],
  ['PRP-24010', 'Thames Property Group', 'GBP', 64000, 4, 'MONTHLY', 8, 4],
  ['MAR-24011', 'Coho Vineyard Exports', 'GBP', 30000, 10, 'QUARTERLY', 4, 2],
]

const create = `mutation($input: CreatePolicyInput!) {
  createPolicy(input: $input) { policy { id instalments { number amount dueDate } } }
}`
const pay = `mutation($input: PayInstalmentInput!) { payInstalment(input: $input) { policy { id } } }`

let created = 0
for (const [policyNumber, insuredName, currency, totalPremium, ago, frequency, count, paid] of policies) {
  try {
    const { createPolicy } = await gql(create, {
      input: { policyNumber, insuredName, currency, totalPremium, inceptionDate: iso(monthsAgo(ago, 5)), frequency, numberOfInstalments: count },
    })
    for (const i of createPolicy.policy.instalments.slice(0, paid)) {
      await gql(pay, { input: { policyId: createPolicy.policy.id, instalmentNumber: i.number, amount: i.amount, paidOn: i.dueDate } })
    }
    created++
    console.log(`✓ ${policyNumber}  ${insuredName}  (${paid}/${count} paid)`)
  } catch (e) {
    console.log(`– ${policyNumber}: ${e.message}`)
  }
}
console.log(`\nCreated ${created} policies via ${api}`)
