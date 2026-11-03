import { useState } from 'react'
import { toast } from 'sonner'
import { ONSITE_ATTACHMENT_CATEGORIES } from '@/common/onsiteSurvey'
import { Field, Select } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { attachmentCategoryLabel } from '@/features/onsite-survey/onSiteSurveyDisplay'
import { useAddOnSiteSurveyFileMutation } from '@/hooks/useOnSiteSurvey'
import { errorMessage } from '@/services/api/errors'

// Chọn loại rồi chọn ảnh / tài liệu; từng tệp được tải lên kho, đăng ký và gắn vào biên bản, lần lượt từng tệp

const PURPOSE = 'ONSITE_SURVEY_EVIDENCE'

export function OnSiteSurveyUpload({ appointmentId, disabled }: { appointmentId: string; disabled?: boolean }) {
  const add = useAddOnSiteSurveyFileMutation(appointmentId)
  const [category, setCategory] = useState<string>('ROOF')
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: File[]) {
    setError(null)
    const bad = files.find((f) => fileProblem(f, PURPOSE))
    if (bad) return setError(`${bad.name}: ${fileProblem(bad, PURPOSE)}`)
    let done = 0
    for (const file of files) {
      setProgress(`Đang tải tệp ${done + 1}/${files.length}…`)
      try {
        await add.mutateAsync({ file, category })
        done++
      } catch (e) {
        setError(`${file.name}: ${errorMessage(e)}`)
        break
      }
    }
    setProgress(null)
    if (done > 0) toast.success(`Đã thêm ${done} tệp vào mục ${attachmentCategoryLabel(category)}.`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Loại" htmlFor="os-upload-category" className="w-full sm:w-56">
          <Select
            id="os-upload-category"
            value={category}
            disabled={disabled || progress !== null}
            onChange={(e) => setCategory(e.target.value)}
          >
            {ONSITE_ATTACHMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <FileButton
          variant="soft"
          icon="add_a_photo"
          accept={acceptFor(PURPOSE)}
          multiple
          disabled={disabled || progress !== null}
          onFiles={(files) => void upload(files)}
        >
          Thêm ảnh, tài liệu
        </FileButton>
      </div>
      <p className="text-meta text-fg-2">
        {progress ?? `${fileTypesText(PURPOSE)}, tối đa ${maxSizeText(PURPOSE)} mỗi tệp.`}
      </p>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </div>
  )
}
