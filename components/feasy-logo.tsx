import { Fuel } from "lucide-react"

interface FeasyLogoProps {
  size?: number
  className?: string
}

export function FeasyLogo({ size = 24, className = "" }: FeasyLogoProps) {
  return (
    <div className={`relative ${className}`}>
      <Fuel size={size} className="text-white" />
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] font-bold text-purple-600">
        F
      </span>
    </div>
  )
}
