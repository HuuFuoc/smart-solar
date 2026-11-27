import { ROUTES, withId } from '@/routes/paths'

// Đường dẫn phiếu thu theo cổng đang mở: quản lý và quản trị dùng chung trang, khác tiền tố

export type ReceiptPortal = 'manager' | 'admin'

export const receiptPortalOf = (pathname: string): ReceiptPortal =>
  pathname.startsWith(`${ROUTES.admin.home}/`) || pathname === ROUTES.admin.home ? 'admin' : 'manager'

export const receiptQueuePath = (portal: ReceiptPortal) =>
  portal === 'admin' ? ROUTES.admin.cashReceipts : ROUTES.manage.cashReceipts

export const receiptDetailPath = (portal: ReceiptPortal, receiptId: string) =>
  withId(portal === 'admin' ? ROUTES.admin.cashReceipt : ROUTES.manage.cashReceipt, receiptId)

export const receiptContractPath = (portal: ReceiptPortal, contractId: string) =>
  withId(portal === 'admin' ? ROUTES.admin.contract : ROUTES.manage.contract, contractId)
