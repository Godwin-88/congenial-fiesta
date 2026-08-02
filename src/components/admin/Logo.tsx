'use client'

import Image from 'next/image'

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-0.5">
      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
        <Image
          src="/images/logo.jpeg"
          alt="FweezyTech"
          width={32}
          height={32}
          className="object-cover w-full h-full"
        />
      </div>
      <span className="font-bold text-base text-foreground font-heading tracking-tight">
        FweezyTech
        <span className="text-brand-primary"> CMS</span>
      </span>
    </div>
  )
}
