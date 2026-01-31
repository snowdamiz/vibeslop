import type { ImgHTMLAttributes } from 'react'

interface HypeVibeLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
    className?: string
}

/**
 * HypeVibe logo icon - uses the official logo.svg from public folder
 */
export function HypeVibeLogo({ className, ...props }: HypeVibeLogoProps) {
    return (
        <img
            src="/logo.svg"
            alt="HypeVibe"
            className={className}
            {...props}
        />
    )
}
