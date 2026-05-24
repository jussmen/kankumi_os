'use client'

export function PrintButton({ label = '印刷 / PDF保存' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors print:hidden"
    >
      {label}
    </button>
  )
}
