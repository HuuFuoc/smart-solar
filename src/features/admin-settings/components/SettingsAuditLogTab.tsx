import { useState } from 'react'
import { SchedulingAuditTable } from './SchedulingAuditTable'
import { RagVersionAuditTable } from './RagVersionAuditTable'

export function SettingsAuditLogTab() {
  const [subTab, setSubTab] = useState<'system' | 'rag'>('system')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface-1 p-4">
        <h3 className="text-body font-semibold text-fg-1">Nhật ký thay đổi & Kiểm toán hệ thống</h3>
        <div className="flex rounded-control border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => setSubTab('system')}
            className={`rounded px-3 py-1 text-meta font-medium transition-colors ${
              subTab === 'system' ? 'bg-surface-1 text-fg-1 shadow-sm' : 'text-fg-3 hover:text-fg-1'
            }`}
          >
            Chính sách hệ thống
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rag')}
            className={`rounded px-3 py-1 text-meta font-medium transition-colors ${
              subTab === 'rag' ? 'bg-surface-1 text-fg-1 shadow-sm' : 'text-fg-3 hover:text-fg-1'
            }`}
          >
            Phiên bản AI / RAG
          </button>
        </div>
      </div>

      {subTab === 'system' ? <SchedulingAuditTable /> : <RagVersionAuditTable />}
    </div>
  )
}
