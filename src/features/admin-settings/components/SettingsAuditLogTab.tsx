import { useState } from 'react'
import { SchedulingAuditTable } from './SchedulingAuditTable'
import { RagVersionAuditTable } from './RagVersionAuditTable'

export function SettingsAuditLogTab() {
  const [subTab, setSubTab] = useState<'system' | 'rag'>('system')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-panel p-4">
        <h3 className="text-body font-semibold text-fg">Nhật ký thay đổi & Kiểm toán hệ thống</h3>
        <div className="flex rounded-control border border-line bg-panel p-1">
          <button
            type="button"
            onClick={() => setSubTab('system')}
            className={`rounded-control px-3 py-1 text-meta font-medium transition-colors ${
              subTab === 'system' ? 'bg-canvas text-fg' : 'text-fg-3 hover:text-fg'
            }`}
          >
            Chính sách hệ thống
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rag')}
            className={`rounded-control px-3 py-1 text-meta font-medium transition-colors ${
              subTab === 'rag' ? 'bg-canvas text-fg' : 'text-fg-3 hover:text-fg'
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
