import { useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { generateFingerprint } from '@/lib/fingerprint'

interface ImpressionItem {
  type: string
  id: string
}

const BATCH_SIZE = 20
const BATCH_INTERVAL = 5000 // 5 seconds

/**
 * Hook to track impressions for posts and projects using Intersection Observer.
 * Batches impressions and sends them to the API every 5 seconds or when 20 items are collected.
 */
export function useImpressionTracker() {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const seenItemsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<ImpressionItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Function to send impressions to API
  const sendImpressions = useCallback(async () => {
    if (queueRef.current.length === 0) return

    const impressionsToSend = [...queueRef.current]
    queueRef.current = []

    try {
      const fingerprint = generateFingerprint()
      await api.recordImpressions(impressionsToSend, fingerprint)
    } catch (error) {
      console.error('Failed to record impressions:', error)
    }
  }, [])

  // Schedule a batch send
  const scheduleBatchSend = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      sendImpressions()
    }, BATCH_INTERVAL)
  }, [sendImpressions])

  // Add impression to queue
  const addToQueue = useCallback((type: string, id: string) => {
    // Check if already seen
    const key = `${type}-${id}`
    if (seenItemsRef.current.has(key)) return

    seenItemsRef.current.add(key)
    queueRef.current.push({ type, id })

    // Send immediately if batch size reached
    if (queueRef.current.length >= BATCH_SIZE) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      sendImpressions()
    } else {
      scheduleBatchSend()
    }
  }, [sendImpressions, scheduleBatchSend])

  // Initialize Intersection Observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const type = target.dataset.impressionType
            const id = target.dataset.impressionId

            if (type && id) {
              addToQueue(type, id)
              // Stop observing after tracking once
              observerRef.current?.unobserve(target)
            }
          }
        })
      },
      {
        threshold: 0.5, // 50% visible
        rootMargin: '0px',
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [addToQueue])

  // Send any pending impressions on unmount
  useEffect(() => {
    const sendPendingImpressions = () => {
      if (queueRef.current.length === 0) return

      // Use fetch with keepalive for reliability on page unload
      // This allows us to include Authorization header unlike sendBeacon
      const fingerprint = generateFingerprint()
      const token = localStorage.getItem('onvibe_token')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const impressionsToSend = [...queueRef.current]
      queueRef.current = [] // Clear queue to prevent duplicate sends

      // Use fetch with keepalive instead of sendBeacon to include auth headers
      fetch(`${apiUrl}/impressions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          impressions: impressionsToSend,
          fingerprint
        }),
        keepalive: true, // Ensures request completes even if page is unloading
      }).catch((error) => {
        console.error('Failed to send pending impressions:', error)
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendPendingImpressions()
      }
    }

    window.addEventListener('beforeunload', sendPendingImpressions)
    window.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', sendPendingImpressions)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Return ref callback to attach to elements
  const trackRef = useCallback((element: HTMLElement | null) => {
    if (!element || !observerRef.current) return

    observerRef.current.observe(element)
  }, [])

  return { trackRef }
}
