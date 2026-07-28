'use client'

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-0.5">
      <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center font-bold text-white text-lg font-heading shrink-0">
        F
      </div>
      <span className="font-bold text-base text-foreground font-heading tracking-tight">
        FweezyTech
        <span className="text-brand-primary"> CMS</span>
      </span>
    </div>
  )
}
