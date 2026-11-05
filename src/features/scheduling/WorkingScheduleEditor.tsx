import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Segmented } from '@/components/common/ui/segmented'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
import { CustomScheduleTimetable } from '@/features/scheduling/CustomScheduleTimetable'
import { DefaultScheduleTimetable } from '@/features/scheduling/DefaultScheduleTimetable'
import { toWeek } from '@/features/scheduling/workingScheduleRules'
import { useSetWorkingScheduleMutation, useWorkingScheduleQuery } from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'

// Giờ làm theo tuần (giờ Việt Nam). Mặc định dùng giờ chung, "Giờ riêng" thay cả tuần
export function WorkingScheduleEditor({ technicianUserId }: { technicianUserId: string }) {
  const query = useWorkingScheduleQuery(technicianUserId)
  const save = useSetWorkingScheduleMutation()
  const [mode, setMode] = useState<'default' | 'custom' | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [formKey, setFormKey] = useState(0)

  if (query.isPending) return <Skeleton className="h-64" />
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />

  const schedule = query.data
  const current = mode ?? (schedule.usesDefault ? 'default' : 'custom')

  async function switchToDefault() {
    setFailure(null)
    try {
      await save.mutateAsync({ id: technicianUserId, body: { useDefault: true, periods: [] } })
      toast.success('Đã chuyển về giờ chung của hệ thống.')
      setMode(null)
    } catch (error) {
      setFailure(error)
    }
  }

  const conflicts = conflictsOf(failure)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label="Kiểu giờ làm"
          value={current}
          onChange={(next) => {
            setMode(next)
            setFailure(null)
            setFormKey((k) => k + 1)
          }}
          options={[
            { value: 'default', label: 'Giờ chung của hệ thống' },
            { value: 'custom', label: 'Giờ riêng (Thời khóa biểu)' },
          ]}
          className="w-fit"
        />
        {current === 'default' && !schedule.usesDefault && (
          <Button
            icon="restart_alt"
            variant="primary"
            size="sm"
            disabled={save.isPending}
            onClick={() => void switchToDefault()}
          >
            {save.isPending ? 'Đang lưu…' : 'Xác nhận dùng giờ chung'}
          </Button>
        )}
      </div>

      {current === 'default' ? (
        <div className="space-y-4">
          {schedule.usesDefault ? (
            <DefaultScheduleTimetable schedule={schedule} />
          ) : (
            <div className="rounded-container border border-line bg-surface-1 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="info" className="mt-0.5 shrink-0 text-[20px] text-accent" />
                <div>
                  <h4 className="font-semibold text-fg">Đang áp dụng giờ riêng</h4>
                  <p className="mt-1 text-meta text-fg-2">
                    Kỹ thuật viên này hiện đang sử dụng lịch làm việc riêng. Khi chuyển về giờ chung của hệ thống (mặc định
                    08:00-12:00 và 13:00-17:00 mỗi ngày), cấu hình giờ riêng sẽ được đặt lại.
                  </p>
                  <div className="mt-4">
                    <Button
                      icon="restart_alt"
                      variant="primary"
                      disabled={save.isPending}
                      onClick={() => void switchToDefault()}
                    >
                      {save.isPending ? 'Đang lưu…' : 'Chuyển về giờ chung'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <ConflictList conflicts={conflicts} />
        </div>
      ) : (
        <CustomScheduleTimetable
          key={formKey}
          initial={toWeek(schedule.periods)}
          technicianUserId={technicianUserId}
          onSaved={() => setMode(null)}
        />
      )}
    </div>
  )
}
