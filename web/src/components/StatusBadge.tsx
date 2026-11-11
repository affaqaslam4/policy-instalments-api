import type { DisplayStatus } from '../lib/instalments'

const icon: Record<DisplayStatus, string> = { Paid: '✓', Due: '○', Overdue: '!' }

/** Icon + label, so status never depends on colour alone. */
export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <span aria-hidden="true">{icon[status]}</span>
      {status}
    </span>
  )
}
