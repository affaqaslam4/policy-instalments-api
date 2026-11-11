import { gql, type TypedDocumentNode } from '@apollo/client'

export type Frequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'
export type InstalmentStatus = 'PENDING' | 'PAID'

export interface Instalment {
  number: number
  dueDate: string
  amount: number
  status: InstalmentStatus
  paidOn: string | null
}

export interface PolicySummary {
  id: string
  policyNumber: string
  insuredName: string
  currency: string
  totalPremium: number
  amountPaid: number
  outstanding: number
  frequency: Frequency
}

export interface PolicyDetail extends PolicySummary {
  inceptionDate: string
  instalments: Instalment[]
}

export interface CreatePolicyInput {
  policyNumber: string
  insuredName: string
  currency: string
  totalPremium: number
  inceptionDate: string
  frequency: Frequency
  numberOfInstalments: number
}

export interface CurrencySummary {
  currency: string
  policies: number
  totalPremium: number
  collected: number
  outstanding: number
  overdueCount: number
  overdueAmount: number
}

export interface UpcomingCollection {
  month: string
  currency: string
  amount: number
  instalments: number
}

export interface OverdueInstalment {
  policyId: string
  policyNumber: string
  insuredName: string
  currency: string
  instalmentNumber: number
  dueDate: string
  amount: number
  daysOverdue: number
}

export interface PortfolioReport {
  asOf: string
  byCurrency: CurrencySummary[]
  upcoming: UpcomingCollection[]
  overdue: OverdueInstalment[]
}

const POLICY_DETAIL = gql`
  fragment PolicyDetail on Policy {
    id
    policyNumber
    insuredName
    currency
    totalPremium
    amountPaid
    outstanding
    frequency
    inceptionDate
    instalments {
      number
      dueDate
      amount
      status
      paidOn
    }
  }
`

export const POLICIES: TypedDocumentNode<{ policies: PolicySummary[] }> = gql`
  query Policies {
    policies {
      id
      policyNumber
      insuredName
      currency
      totalPremium
      amountPaid
      outstanding
      frequency
    }
  }
`

export const POLICY: TypedDocumentNode<{ policyById: PolicyDetail | null }, { id: string }> = gql`
  ${POLICY_DETAIL}
  query Policy($id: UUID!) {
    policyById(id: $id) {
      ...PolicyDetail
    }
  }
`

export const CREATE_POLICY: TypedDocumentNode<
  { createPolicy: { policy: { id: string } } },
  { input: CreatePolicyInput }
> = gql`
  mutation CreatePolicy($input: CreatePolicyInput!) {
    createPolicy(input: $input) {
      policy {
        id
      }
    }
  }
`

export interface PayInstalmentInput {
  policyId: string
  instalmentNumber: number
  amount: number
  paidOn: string
}

export const PAY_INSTALMENT: TypedDocumentNode<
  { payInstalment: { policy: PolicyDetail } },
  { input: PayInstalmentInput }
> = gql`
  ${POLICY_DETAIL}
  mutation PayInstalment($input: PayInstalmentInput!) {
    payInstalment(input: $input) {
      policy {
        ...PolicyDetail
      }
    }
  }
`

export const PORTFOLIO_REPORT: TypedDocumentNode<{ portfolioReport: PortfolioReport }, { asOf?: string }> = gql`
  query PortfolioReport($asOf: LocalDate) {
    portfolioReport(asOf: $asOf) {
      asOf
      byCurrency {
        currency
        policies
        totalPremium
        collected
        outstanding
        overdueCount
        overdueAmount
      }
      upcoming {
        month
        currency
        amount
        instalments
      }
      overdue {
        policyId
        policyNumber
        insuredName
        currency
        instalmentNumber
        dueDate
        amount
        daysOverdue
      }
    }
  }
`
