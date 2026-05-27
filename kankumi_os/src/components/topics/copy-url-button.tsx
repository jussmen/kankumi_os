'use client'

import { useState } from 'react'

export function CopyUrlButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {copied ? 'コピー済み' : 'URLをコピー'}
    </button>
  )
}
