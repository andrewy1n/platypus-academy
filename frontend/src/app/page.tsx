'use client'

import { useRouter } from 'next/navigation'
import LandingPage from '../components/LandingPage'

export default function Home() {
  const router = useRouter()

  const handleGetStarted = () => {
    // Navigate to login page
    router.push('/login')
  }

  return (
    <LandingPage onGetStarted={handleGetStarted} />
  )
}
