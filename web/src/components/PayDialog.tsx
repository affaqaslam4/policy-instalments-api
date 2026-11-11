import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Instalment } from '../lib/graphql'
import { formatDate, money, todayIso } from '../lib/format'

interface Props {
  instalment: Instalment
  currency: string
  submitting: boolean
  error: string | null
  onConfirm: (amount: number, paidOn: string) => void
  onClose: () => void
}

export function PayDialog({ instalment, currency, submitting, error, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [amount, setAmount] = useState(instalment.amount.toFixed(2))
  const [paidOn, setPaidOn] = useState(todayIso())

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal()
    return () => dialog?.close?.()
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onConfirm(Number(amount), paidOn)
  }

  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="pay-title">
      <form className="stack" onSubmit={submit}>
        <div>
          <h2 id="pay-title">Pay instalment {instalment.number}</h2>
          <p className="subtle">
            Due {formatDate(instalment.dueDate)} · {money(instalment.amount, currency)}
          </p>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="pay-amount">Amount ({currency})</label>
          <input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="help">Must match the instalment amount exactly.</span>
        </div>
        <div className="field">
          <label htmlFor="pay-date">Paid on</label>
          <input id="pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </div>

        <div className="actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={submitting || !paidOn || !amount}>
            {submitting ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
