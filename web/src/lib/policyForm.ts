import type { CreatePolicyInput, Frequency } from './graphql'

export interface PolicyFormValues {
  policyNumber: string
  insuredName: string
  currency: string
  totalPremium: string
  inceptionDate: string
  frequency: Frequency
  numberOfInstalments: string
}

export type PolicyFormErrors = Partial<Record<keyof PolicyFormValues, string>>

export const currencies = ['USD', 'EUR', 'GBP', 'AED', 'QAR', 'PKR']

/**
 * Mirrors the server's domain rules so users get instant feedback.
 * The server still enforces every rule; this is only for a better form experience.
 */
export function validatePolicy(v: PolicyFormValues): PolicyFormErrors {
  const errors: PolicyFormErrors = {}
  if (!v.policyNumber.trim()) errors.policyNumber = 'Policy number is required.'
  if (!v.insuredName.trim()) errors.insuredName = 'Insured name is required.'
  if (!/^[A-Za-z]{3}$/.test(v.currency)) errors.currency = 'Choose a currency.'

  const premium = Number(v.totalPremium)
  if (!v.totalPremium.trim() || Number.isNaN(premium)) errors.totalPremium = 'Enter the premium amount.'
  else if (premium <= 0) errors.totalPremium = 'Premium must be greater than zero.'
  else if (!/^\d+(\.\d{1,2})?$/.test(v.totalPremium.trim())) errors.totalPremium = 'Use at most 2 decimal places.'

  if (!v.inceptionDate) errors.inceptionDate = 'Choose the inception date.'

  const count = Number(v.numberOfInstalments)
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    errors.numberOfInstalments = 'Choose between 1 and 12 instalments.'
  } else if (!errors.totalPremium && Math.floor((premium / count) * 100) === 0) {
    errors.numberOfInstalments = 'The premium is too small to split into that many instalments.'
  }
  return errors
}

export function toInput(v: PolicyFormValues): CreatePolicyInput {
  return {
    policyNumber: v.policyNumber.trim(),
    insuredName: v.insuredName.trim(),
    currency: v.currency,
    totalPremium: Number(v.totalPremium),
    inceptionDate: v.inceptionDate,
    frequency: v.frequency,
    numberOfInstalments: Number(v.numberOfInstalments),
  }
}

/** Same split as the server: even amounts rounded down to the cent, remainder on the first instalment. */
export function previewSchedule(premium: number, count: number): { first: number; regular: number } | null {
  if (!(premium > 0) || !Number.isInteger(count) || count < 1 || count > 12) return null
  const cents = Math.round(premium * 100)
  const regular = Math.floor(cents / count)
  if (regular === 0) return null
  return { first: (cents - regular * (count - 1)) / 100, regular: regular / 100 }
}
