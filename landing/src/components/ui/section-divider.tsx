interface SectionDividerProps {
  variant?: 'wave' | 'curve' | 'slant'
  flip?: boolean
  className?: string
  fillClassName?: string
}

export function SectionDivider({
  variant = 'wave',
  flip = false,
  className = '',
  fillClassName = 'fill-background'
}: SectionDividerProps) {
  const paths = {
    wave: 'M0,32 C320,96 640,0 960,64 C1280,128 1440,32 1440,32 L1440,100 L0,100 Z',
    curve: 'M0,64 Q720,128 1440,64 L1440,100 L0,100 Z',
    slant: 'M0,100 L1440,60 L1440,100 L0,100 Z',
  }

  return (
    <div
      className={`absolute left-0 right-0 w-full overflow-hidden leading-none ${flip ? 'top-0 rotate-180' : 'bottom-0'} ${className}`}
      style={{ height: '60px' }}
    >
      <svg
        className="relative block w-full h-full"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={paths[variant]}
          className={fillClassName}
        />
      </svg>
    </div>
  )
}
