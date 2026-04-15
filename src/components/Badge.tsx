import { BADGE_COLORS } from '../types'
interface BadgeProps { value: string }
export function Badge({ value }: BadgeProps) {
  const cls = BADGE_COLORS[value] || 'badge-onhold'
  return <span className={`badge ${cls}`}>{value}</span>
}
