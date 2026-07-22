'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type FormData = {
  name: string
  publication: string
  deadline: string
  message: string
  email: string
}

export default function PressInquiryForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    publication: '',
    deadline: '',
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
    if (formData.publication.length < 2) {
      setError('Publication is required')
      return
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Valid email is required')
      return
    }
    if (formData.message.length < 10 || formData.message.length > 2000) {
      setError('Message must be between 10 and 2000 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/press-inquiry', {
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
            ✅ Thanks! We'll get back to you shortly.
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
        <label className="block text-sm font-medium text-gray-300 mb-1">Publication *</label>
        <Input
          value={formData.publication}
          onChange={(e) => updateField('publication', e.target.value)}
          placeholder="Publication or outlet name"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Deadline</label>
        <Input
          value={formData.deadline}
          onChange={(e) => updateField('deadline', e.target.value)}
          placeholder="e.g. End of month"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Message * <span className="text-gray-500 text-xs">({formData.message.length}/2000)</span>
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => updateField('message', e.target.value)}
          placeholder="Tell us about your story or request..."
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