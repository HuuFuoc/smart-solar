import { ROUTES } from '@/routes/paths'

/** Kinh doanh, quản lý, quản trị theo dõi công nợ; kỹ thuật viên và khách không có mục này */
export type CollectionViewer = 'sales' | 'manager' | 'admin'

export const COLLECTION_ROUTES: Record<CollectionViewer, { list: string; detail: string; contract: string }> = {
  sales: { list: ROUTES.ops.collections, detail: ROUTES.ops.collection, contract: ROUTES.ops.contract },
  manager: { list: ROUTES.manage.collections, detail: ROUTES.manage.collection, contract: ROUTES.manage.contract },
  admin: { list: ROUTES.admin.collections, detail: ROUTES.admin.collection, contract: ROUTES.admin.contract },
}
