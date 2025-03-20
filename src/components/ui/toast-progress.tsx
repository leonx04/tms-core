"use client"

import { useEffect, useState } from "react"

interface ToastProgressProps {
    duration?: number
    onComplete?: () => void
}

export function ToastProgress({ duration = 5000, onComplete }: ToastProgressProps) {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const startTime = Date.now()
        const endTime = startTime + duration

        const updateProgress = () => {
            const now = Date.now()
            const remaining = Math.max(0, endTime - now)
            const newProgress = 100 - (remaining / duration) * 100

            setProgress(newProgress)

            if (newProgress < 100) {
                requestAnimationFrame(updateProgress)
            } else {
                onComplete?.()
            }
        }

        const animationId = requestAnimationFrame(updateProgress)

        return () => {
            cancelAnimationFrame(animationId)
        }
    }, [duration, onComplete])

    return (
        <div className="toast-progress">
            <div className="toast-progress-bar" style={{ width: `${progress}%` }} />
        </div>
    )
}

