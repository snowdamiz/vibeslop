import type { ImgHTMLAttributes } from 'react'

interface OnvibeLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
    className?: string
}

/**
 * Onvibe logo icon - uses the official logo.svg from public folder
 */
export function OnvibeLogo({ className, ...props }: OnvibeLogoProps) {
    return (
        <img
            src="/logo.svg"
            alt="Onvibe"
            className={className}
            {...props}
        />
    )
}
