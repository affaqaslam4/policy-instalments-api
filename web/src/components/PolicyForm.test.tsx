import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PolicyForm } from './PolicyForm'
import type { PolicyFormValues } from '../lib/policyForm'

const blank: PolicyFormValues = {
  policyNumber: '',
  insuredName: '',
  currency: 'USD',
  totalPremium: '',
  inceptionDate: '2026-01-31',
  frequency: 'MONTHLY',
  numberOfInstalments: '3',
}

describe('PolicyForm', () => {
  it('shows errors and does not submit an incomplete form', async () => {
    const onSubmit = vi.fn()
    render(<PolicyForm initial={blank} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create policy' }))

    expect(screen.getByText('Policy number is required.')).toBeInTheDocument()
    expect(screen.getByText('Enter the premium amount.')).toBeInTheDocument()
    expect(screen.getByLabelText('Policy number')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('previews the schedule and submits valid values', async () => {
    const onSubmit = vi.fn()
    render(<PolicyForm initial={blank} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Policy number'), 'POL-9')
    await userEvent.type(screen.getByLabelText('Insured name'), 'Contoso Marine')
    await userEvent.type(screen.getByLabelText('Total premium'), '1000')

    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('First payment US$333.34, then 2 × US$333.33')

    await userEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ policyNumber: 'POL-9', totalPremium: '1000' }))
  })

  it('shows the server error', () => {
    render(<PolicyForm initial={blank} onSubmit={vi.fn()} serverError="Policy number POL-9 already exists." />)
    expect(screen.getByRole('alert')).toHaveTextContent('already exists')
  })
})
