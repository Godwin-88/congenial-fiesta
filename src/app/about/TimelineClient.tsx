'use client'

import { useEffect, useRef, useState } from 'react'

interface Milestone {
  id: string
  year: number
  title: string
  description?: string | null
  displayOrder?: number | null
}

interface TimelineClientProps {
  milestonesByYear: Record<number, Milestone[]>
  sortedYears: number[]
}

function MilestoneItem({ milestone, index }: { milestone: Milestone; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`relative flex gap-4 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className="z-10 flex h-4 w-4 shrink-0 rounded-full bg-brand-primary" />
        <div className="w-0.5 flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="pb-8">
        <h3 className="font-semibold text-foreground">{milestone.title}</h3>
        {milestone.description && (
          <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
        )}
      </div>
    </div>
  )
}

export default function TimelineClient({ milestonesByYear, sortedYears }: TimelineClientProps) {
  return (
    <div className="space-y-0">
      {sortedYears.map((year) => (
        <div key={year}>
          {/* Year header */}
          <div className="sticky top-20 z-20 -ml-2 mb-4">
            <span className="inline-block rounded-full bg-brand-primary px-4 py-1 text-sm font-bold text-white">
              {year}
            </span>
          </div>

          {/* Milestones for this year */}
          <div className="ml-2">
            {milestonesByYear[year].map((milestone, index) => (
              <MilestoneItem key={milestone.id} milestone={milestone} index={index} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}