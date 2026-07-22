'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const BUDGET_OPTIONS = [
  'Under $500',
  '$500–$2,000',
  '$2,000–$5,000',
  '$5,000–$10,000',
  '$10,000+',
]

type FormData = {
  name: string
  company: string
  website: string
  budgetRange: string
  message: string
  email: string
}

export default function SponsorInquiryForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    company: '',
    website: '',
    budgetRange: '',
    message: '',
    email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setError(null)

    // Client-side validation
    if (formData.name.length < 2 || formData.name.length > 100) {
      setError('Name must be between 2 and 100 characters')
      return
    }
    if (formData.company.length < 2 || formData.company.length > 100) {
      setError('Company must be between 2 and 100 characters')
      return
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Valid email is required')
      return
    }
    if (!formData.budgetRange) {
      setError('Please select a budget range')
      return
    }
    if (formData.message.length < 10 || formData.message.length > 2000) {
      setError('Message must be between 10 and 2000 characters')
      return
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      setError('Website must be a valid URL (include http:// or https://)')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/sponsor-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card className="bg-green-900/20 border-green-700/30">
        <CardContent className="pt-6">
          <p className="text-green-400 text-lg font-medium">
            ✅ Message sent! We'll be in touch within 3 business days.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Your full name"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Company *</label>
        <Input
          value={formData.company}
          onChange={(e) => updateField('company', e.target.value)}
          placeholder="Company name"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Company Website</label>
        <Input
          value={formData.website}
          onChange={(e) => updateField('website', e.target.value)}
          placeholder="https://example.com"
          type="url"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Budget Range *</label>
        <select
          value={formData.budgetRange}
          onChange={(e) => updateField('budgetRange', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
        >
          <option value="">Select a budget range</option>
          {BUDGET_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Message * <span className="text-gray-500 text-xs">({formData.message.length}/2000)</span>
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => updateField('message', e.target.value)}
          placeholder="Tell us about your brand and what you're looking for..."
          rows={5}
          maxLength={2000}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
        <Input
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="your@email.com"
          type="email"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white py-3"
      >
        {isSubmitting ? 'Sending...' : 'Send Inquiry'}
      </Button>
    </div>
  )
}