import { previewSchedule, toInput, validatePolicy, type PolicyFormValues } from './policyForm'

const valid: PolicyFormValues = {
  policyNumber: 'POL-1',
  insuredName: 'Northwind',
  currency: 'USD',
  totalPremium: '1000',
  inceptionDate: '2026-01-31',
  frequency: 'MONTHLY',
  numberOfInstalments: '3',
}

describe('validatePolicy', () => {
  it('accepts a valid policy', () => {
    expect(validatePolicy(valid)).toEqual({})
  })

  it('requires the policy number and insured name', () => {
    const errors = validatePolicy({ ...valid, policyNumber: ' ', insuredName: '' })
    expect(errors.policyNumber).toBeDefined()
    expect(errors.insuredName).toBeDefined()
  })

  it.each(['0', '-5', 'abc', '10.123'])('rejects premium %s', (totalPremium) => {
    expect(validatePolicy({ ...valid, totalPremium }).totalPremium).toBeDefined()
  })

  it.each(['0', '13', '2.5'])('rejects %s instalments', (numberOfInstalments) => {
    expect(validatePolicy({ ...valid, numberOfInstalments }).numberOfInstalments).toBeDefined()
  })

  it('rejects a premium too small to split', () => {
    expect(validatePolicy({ ...valid, totalPremium: '0.05', numberOfInstalments: '12' }).numberOfInstalments)
      .toMatch(/too small/)
  })
})

describe('previewSchedule', () => {
  it('matches the server rounding: remainder on the first instalment', () => {
    expect(previewSchedule(1000, 3)).toEqual({ first: 333.34, regular: 333.33 })
  })

  it('splits an even premium equally', () => {
    expect(previewSchedule(1200, 4)).toEqual({ first: 300, regular: 300 })
  })

  it('returns null for invalid input', () => {
    expect(previewSchedule(0, 3)).toBeNull()
    expect(previewSchedule(100, 13)).toBeNull()
  })
})

it('toInput trims text and converts numbers', () => {
  expect(toInput({ ...valid, policyNumber: ' POL-1 ' })).toMatchObject({
    policyNumber: 'POL-1',
    totalPremium: 1000,
    numberOfInstalments: 3,
  })
})
