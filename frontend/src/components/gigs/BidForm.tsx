import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface BidFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { amount: number; delivery_days: number; proposal: string }) => Promise<void>
}

export function BidForm({ isOpen, onClose, onSubmit }: BidFormProps) {
  const [amount, setAmount] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [proposal, setProposal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!amount || !deliveryDays || !proposal) {
      setError('All fields are required')
      return
    }

    const amountNum = parseFloat(amount)
    const daysNum = parseInt(deliveryDays)

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (isNaN(daysNum) || daysNum <= 0) {
      setError('Please enter valid delivery days')
      return
    }

    if (proposal.length < 50) {
      setError('Proposal must be at least 50 characters')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        amount: Math.round(amountNum * 100), // Convert to cents
        delivery_days: daysNum,
        proposal
      })
      setAmount('')
      setDeliveryDays('')
      setProposal('')
      onClose()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to submit bid')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place Your Bid</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Your Bid Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="1000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery">Delivery Time (days)</Label>
            <Input
              id="delivery"
              type="number"
              placeholder="7"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal">Your Proposal</Label>
            <Textarea
              id="proposal"
              placeholder="Explain your approach, relevant experience, and why you're the best fit for this gig... (min 50 characters)"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={6}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {proposal.length} characters (minimum 50)
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Bid
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
