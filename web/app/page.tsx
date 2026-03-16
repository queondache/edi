'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const done = localStorage.getItem('edi_onboarding_done')
    router.replace(done ? '/home' : '/onboarding')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
    </div>
  )
}
