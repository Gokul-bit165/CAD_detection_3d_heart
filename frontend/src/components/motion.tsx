import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  return reduced
}

interface RevealProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.45,
  y = 16,
  className = '',
}: RevealProps) {
  const reduced = usePrefersReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface CountUpProps {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}

export function CountUp({
  value,
  duration = 0.9,
  format = (n) => `${Math.round(n)}%`,
  className = '',
}: CountUpProps) {
  const reduced = usePrefersReducedMotion()
  const [displayValue, setDisplayValue] = useState(() => (reduced ? value : 0))

  useEffect(() => {
    if (reduced) {
      setDisplayValue(value)
      return
    }

    let startTimestamp: number | null = null
    const startVal = 0
    const endVal = value
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = startVal + (endVal - startVal) * ease
      setDisplayValue(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, duration, reduced])

  return <span className={`tabular-nums ${className}`}>{format(displayValue)}</span>
}

interface StaggerProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

export function Stagger({ children, staggerDelay = 0.05, className = '' }: StaggerProps) {
  const reduced = usePrefersReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}