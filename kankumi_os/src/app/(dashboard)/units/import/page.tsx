import Link from 'next/link'
import { CsvImport } from '@/components/units/csv-import'

export default function ImportPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/units" className="text-sm text-gray-500 hover:text-gray-700">
          ← Unit台帳
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">CSVインポート</h1>
        <p className="text-sm text-gray-500 mt-1">
          同じ部屋番号が既に存在する場合は上書き更新されます。
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <CsvImport />
      </div>
    </div>
  )
}
