import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface GigStatusBadgeProps {
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
}

export function GigStatusBadge({ status }: GigStatusBadgeProps) {
  const config = {
    open: {
      label: 'Open',
      icon: Clock,
      variant: 'default' as const,
      className: 'bg-green-500/10 text-green-700 dark:text-green-400'
    },
    in_progress: {
      label: 'In Progress',
      icon: Loader2,
      variant: 'default' as const,
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle,
      variant: 'default' as const,
      className: 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    },
    cancelled: {
      label: 'Cancelled',
      icon: XCircle,
      variant: 'default' as const,
      className: 'bg-red-500/10 text-red-700 dark:text-red-400'
    }
  }

  const { label, icon: Icon, className } = config[status]

  return (
    <Badge variant="default" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  )
}
