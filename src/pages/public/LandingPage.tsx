import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { CtaSection, HeroSection, SolutionSection, WorkflowSection } from '@/features/landing'
import { pageTitle } from '@/data/landing'

/*
  Trang chủ công khai "/" – nền tảng tư vấn lắp đặt, bảo hành và bảo trì điện mặt trời cho hộ gia đình.
  Hero ảnh ngày / đêm theo giao diện → giải pháp → quy trình bốn bước → mời đăng ký khảo sát.
*/
export function LandingPage() {
  const { hash } = useLocation()

  // Vào "/" kèm hash (từ header hay footer của route khác) thì cuộn tới section đó.
  useEffect(() => {
    if (!hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <>
      <title>{pageTitle}</title>
      <HeroSection />
      <SolutionSection />
      <WorkflowSection />
      <CtaSection />
    </>
  )
}
