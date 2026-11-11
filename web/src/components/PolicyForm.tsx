import { useState, type FormEvent } from 'react'
import { frequencyLabel, money } from '../lib/format'
import {
  currencies,
  previewSchedule,
  validatePolicy,
  type PolicyFormErrors,
  type PolicyFormValues,
} from '../lib/policyForm'

interface Props {
  initial: PolicyFormValues
  submitting?: boolean
  serverError?: string | null
  onSubmit: (values: PolicyFormValues) => void
  onCancel?: () => void
}

export function PolicyForm({ initial, submitting = false, serverError, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<PolicyFormErrors>({})
  const [touched, setTouched] = useState(false)

  const set = <K extends keyof PolicyFormValues>(key: K, value: PolicyFormValues[K]) => {
    const next = { ...values, [key]: value }
    setValues(next)
    if (touched) setErrors(validatePolicy(next))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const found = validatePolicy(values)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(values)
  }

  const preview = previewSchedule(Number(values.totalPremium), Number(values.numberOfInstalments))

  const field = (key: keyof PolicyFormValues) => ({
    id: key,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  })
  const error = (key: keyof PolicyFormValues) =>
    errors[key] ? <span className="error" id={`${key}-error`}>{errors[key]}</span> : null

  return (
    <form className="form card" onSubmit={submit} noValidate>
      {serverError && <div className="alert error" role="alert">{serverError}</div>}

      <div className="form-row">
        <div className="field">
          <label htmlFor="policyNumber">Policy number</label>
          <input {...field('policyNumber')} value={values.policyNumber} placeholder="POL-1001"
            onChange={(e) => set('policyNumber', e.target.value)} />
          {error('policyNumber')}
        </div>
        <div className="field">
          <label htmlFor="insuredName">Insured name</label>
          <input {...field('insuredName')} value={values.insuredName} placeholder="Northwind Shipping"
            onChange={(e) => set('insuredName', e.target.value)} />
          {error('insuredName')}
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="totalPremium">Total premium</label>
          <input {...field('totalPremium')} inputMode="decimal" value={values.totalPremium} placeholder="12000.00"
            onChange={(e) => set('totalPremium', e.target.value)} />
          {error('totalPremium')}
        </div>
        <div className="field">
          <label htmlFor="currency">Currency</label>
          <select {...field('currency')} value={values.currency} onChange={(e) => set('currency', e.target.value)}>
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {error('currency')}
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="inceptionDate">Inception date</label>
          <input {...field('inceptionDate')} type="date" value={values.inceptionDate}
            onChange={(e) => set('inceptionDate', e.target.value)} />
          <span className="help">The first instalment is due on this date.</span>
          {error('inceptionDate')}
        </div>
        <div className="field">
          <label htmlFor="frequency">Payment frequency</label>
          <select {...field('frequency')} value={values.frequency}
            onChange={(e) => set('frequency', e.target.value as PolicyFormValues['frequency'])}>
            {Object.entries(frequencyLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="numberOfInstalments">Number of instalments</label>
        <input {...field('numberOfInstalments')} type="number" min={1} max={12} value={values.numberOfInstalments}
          onChange={(e) => set('numberOfInstalments', e.target.value)} style={{ maxWidth: 140 }} />
        {error('numberOfInstalments')}
        {preview && !errors.numberOfInstalments && (
          <span className="help" data-testid="schedule-preview">
            {Number(values.numberOfInstalments) === 1
              ? `One payment of ${money(preview.first, values.currency)}`
              : preview.first === preview.regular
                ? `${values.numberOfInstalments} payments of ${money(preview.regular, values.currency)}`
                : `First payment ${money(preview.first, values.currency)}, then ${Number(values.numberOfInstalments) - 1} × ${money(preview.regular, values.currency)}`}
          </span>
        )}
      </div>

      <div className="actions">
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create policy'}
        </button>
      </div>
    </form>
  )
}
