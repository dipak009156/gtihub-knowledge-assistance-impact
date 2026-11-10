import { useEffect, useRef, useState } from 'react'

export interface UsePollingOptions {
  interval?: number
  enabled?: boolean
  maxDuration?: number // Stop after max duration (ms)
  onTimeout?: () => void
}

export function usePolling(
  callback: () => Promise<void> | void,
  options: UsePollingOptions = {}
) {
  const {
    interval = 2000,
    enabled = true,
    maxDuration = 10 * 60 * 1000, // 10 minutes
    onTimeout,
  } = options

  const savedCallback = useRef(callback)
  const savedOnTimeout = useRef(onTimeout)
  const [timedOut, setTimedOut] = useState(false)
  const startTimeRef = useRef<number | null>(null)

  // Always keep refs up-to-date without triggering a re-run of the polling effect.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    savedOnTimeout.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!enabled) {
      startTimeRef.current = null
      setTimedOut(false)
      return
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    let isMounted = true
    let timerId: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      if (!isMounted) return

      if (
        maxDuration &&
        startTimeRef.current &&
        Date.now() - startTimeRef.current > maxDuration
      ) {
        setTimedOut(true)
        savedOnTimeout.current?.()
        return
      }

      try {
        await savedCallback.current()
      } catch {
        // Continue polling on error without crashing
      }

      if (isMounted) {
        timerId = setTimeout(tick, interval)
      }
    }

    tick()

    return () => {
      isMounted = false
      if (timerId) clearTimeout(timerId)
    }
    // onTimeout intentionally omitted — it's captured via savedOnTimeout ref
    // to prevent restarting the polling loop when the caller passes an inline fn.
  }, [enabled, interval, maxDuration])

  return { timedOut }
}
