import * as React from 'react'
import { Banner04 } from '@/components/ui/banner-04'

export default function Demo() {
  return (
    <div className="relative flex w-full max-w-2xl flex-col items-center justify-center p-6 sm:p-10">
      {/* Subtle ambient spotlight for preview */}
      <div className="pointer-events-none absolute -top-10 size-96 rounded-full bg-blue-500/10 blur-3xl" />
      <Banner04 />
    </div>
  )
}

export { Demo }
