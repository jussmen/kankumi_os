import Link from 'next/link'
import { createUnit } from '@/app/actions/units'
import { UnitForm } from '@/components/units/unit-form'

export default function NewUnitPage() {
  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/units" className="text-sm text-gray-500 hover:text-gray-700">
          ← Unit台帳
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Unit追加</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <UnitForm action={createUnit} submitLabel="追加" />
      </div>
    </div>
  )
}
