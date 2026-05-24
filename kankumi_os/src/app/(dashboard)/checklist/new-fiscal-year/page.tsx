import Link from 'next/link'
import { FiscalYearForm } from '@/components/checklist/fiscal-year-form'

export default function NewFiscalYearPage() {
  return (
    <div className="px-6 py-8 max-w-lg">
      <div className="mb-6">
        <Link href="/checklist" className="text-sm text-gray-500 hover:text-gray-700">
          ← 年間業務に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">会計年度を作成</h1>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <FiscalYearForm />
      </div>
    </div>
  )
}
