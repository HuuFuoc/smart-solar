import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as scheduleService from '@/services/installationScheduleService'
import type { ApiError } from '@/services/api/errors'
import type {
  InstallationScheduleRequest,
  InstallationSlotOffersRequest,
} from '@/types/req/technicianInstallationSchedulesReq'
import type {
  InstallationScheduleView,
  InstallationSlotAvailabilityView,
  InstallationSlotOfferView,
  TechnicianScheduleContractView,
} from '@/types/res/installationSchedulesRes'

// Lịch thi công đã thống nhất với khách. Mọi lệnh ghi xong (kể cả lỗi lịch vừa đổi) đều tải lại mọi khoá của lịch thi công,
// để lần sau luôn gửi đúng revision mới. Không cập nhật lạc quan: trạng thái lịch do backend quyết định

export const installationScheduleKeys = {
  all: ['installation-schedules'] as const,
  technician: () => [...installationScheduleKeys.all, 'technician'] as const,
  technicianContract: (contractId: string) => [...installationScheduleKeys.all, 'technician', contractId] as const,
  customer: () => [...installationScheduleKeys.all, 'customer'] as const,
  customerContract: (contractId: string) => [...installationScheduleKeys.all, 'customer', contractId] as const,
  staff: (status: string | null) => [...installationScheduleKeys.all, 'staff', status ?? 'ALL'] as const,
  staffContract: (contractId: string) => [...installationScheduleKeys.all, 'staff-contract', contractId] as const,
  technicianOffers: (contractId: string) => [...installationScheduleKeys.all, 'technician-offers', contractId] as const,
  customerOffers: (contractId: string) => [...installationScheduleKeys.all, 'customer-offers', contractId] as const,
  availability: (contractId: string, from: string, to: string, durationDays: number) =>
    [...installationScheduleKeys.all, 'availability', contractId, from, to, durationDays] as const,
}

export function useTechnicianSchedulesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<TechnicianScheduleContractView[], ApiError>({
    queryKey: installationScheduleKeys.technician(),
    queryFn: scheduleService.listTechnicianSchedules,
    enabled,
  })
}

export function useTechnicianContractScheduleQuery(contractId: string | undefined) {
  return useQuery<InstallationScheduleView[], ApiError>({
    queryKey: installationScheduleKeys.technicianContract(contractId ?? ''),
    queryFn: () => scheduleService.getTechnicianContractSchedule(contractId!),
    enabled: Boolean(contractId),
  })
}

export function useCustomerSchedulesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<InstallationScheduleView[], ApiError>({
    queryKey: installationScheduleKeys.customer(),
    queryFn: scheduleService.listCustomerSchedules,
    enabled,
  })
}

/** Lịch sử lịch thi công của một hợp đồng; chỉ gọi khi hợp đồng đã ký (trước đó chưa có lịch) */
export function useCustomerContractScheduleQuery(contractId: string | undefined, { enabled = true } = {}) {
  return useQuery<InstallationScheduleView[], ApiError>({
    queryKey: installationScheduleKeys.customerContract(contractId ?? ''),
    queryFn: () => scheduleService.getCustomerContractSchedule(contractId!),
    enabled: enabled && Boolean(contractId),
  })
}

/** `status`: null là mọi trạng thái. Hàng chờ hẹn lại tự tải lại để số đỏ trên menu cập nhật */
export function useStaffInstallationSchedulesQuery(
  status: string | null,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<InstallationScheduleView[], ApiError>({
    queryKey: installationScheduleKeys.staff(status),
    queryFn: () => scheduleService.listStaffSchedules(status),
    refetchInterval: status === 'RESCHEDULE_REQUIRED' ? 60_000 : false,
    enabled,
  })
}

export function useStaffContractScheduleQuery(contractId: string | undefined, { enabled = true } = {}) {
  return useQuery<InstallationScheduleView[], ApiError>({
    queryKey: installationScheduleKeys.staffContract(contractId ?? ''),
    queryFn: () => scheduleService.getStaffContractSchedule(contractId!),
    enabled: enabled && Boolean(contractId),
  })
}

/** Chỉ gọi khi kỹ thuật viên bấm "Xem khung trống" (`args` khác null): backend cho 15 lần / phút */
export function useTechnicianAvailabilityQuery(
  contractId: string,
  args: { from: string; to: string; durationDays: number } | null,
) {
  return useQuery<InstallationSlotAvailabilityView[], ApiError>({
    queryKey: installationScheduleKeys.availability(
      contractId,
      args?.from ?? '',
      args?.to ?? '',
      args?.durationDays ?? 0,
    ),
    queryFn: () => scheduleService.getTechnicianAvailability(contractId, args!.from, args!.to, args!.durationDays),
    enabled: args !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useTechnicianOffersQuery(contractId: string) {
  return useQuery<InstallationSlotOfferView[], ApiError>({
    queryKey: installationScheduleKeys.technicianOffers(contractId),
    queryFn: () => scheduleService.listTechnicianOffers(contractId),
  })
}

export function useCustomerOffersQuery(contractId: string | undefined, { enabled = true } = {}) {
  return useQuery<InstallationSlotOfferView[], ApiError>({
    queryKey: installationScheduleKeys.customerOffers(contractId ?? ''),
    queryFn: () => scheduleService.listCustomerOffers(contractId!),
    enabled: enabled && Boolean(contractId),
  })
}

function useScheduleWrite<V, R>(write: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({
    mutationFn: write,
    onSettled: () => queryClient.invalidateQueries({ queryKey: installationScheduleKeys.all }),
  })
}

type ProposeVars = { contractId: string; body: InstallationScheduleRequest }

export function useProposeTechnicianScheduleMutation() {
  return useScheduleWrite(({ contractId, body }: ProposeVars) =>
    scheduleService.proposeTechnicianSchedule(contractId, body),
  )
}

export function useCancelTechnicianScheduleMutation() {
  return useScheduleWrite(({ scheduleId, reason }: { scheduleId: string; reason: string }) =>
    scheduleService.cancelTechnicianSchedule(scheduleId, reason),
  )
}

export function useRequestScheduleChangeMutation() {
  return useScheduleWrite(({ scheduleId, note }: { scheduleId: string; note: string }) =>
    scheduleService.requestScheduleChange(scheduleId, note),
  )
}

export function useProposeStaffScheduleMutation() {
  return useScheduleWrite(({ contractId, body }: ProposeVars) => scheduleService.proposeStaffSchedule(contractId, body))
}

export function useConfirmStaffScheduleMutation() {
  return useScheduleWrite((contractId: string) => scheduleService.confirmStaffSchedule(contractId))
}

export function useCancelStaffScheduleMutation() {
  return useScheduleWrite(({ scheduleId, reason }: { scheduleId: string; reason: string }) =>
    scheduleService.cancelStaffSchedule(scheduleId, reason),
  )
}

export function usePublishOffersMutation() {
  return useScheduleWrite(({ contractId, body }: { contractId: string; body: InstallationSlotOffersRequest }) =>
    scheduleService.publishTechnicianOffers(contractId, body),
  )
}

export function useSelectOfferMutation() {
  return useScheduleWrite((offerId: string) => scheduleService.selectCustomerOffer(offerId))
}
