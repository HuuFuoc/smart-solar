import { ROLE_LABELS, USER_ROLES, type UserRole } from '@/common/role'

// Tài khoản thử ở /login, chỉ dùng khi chạy dev. Lấy từ .env.development.local, không khai thì ẩn

export type DemoAccount = {
  role: UserRole
  roleLabel: string
  description: string
  email: string
  password: string
}

const DESCRIPTIONS: Record<UserRole, string> = {
  customer: 'Chủ hộ gia đình',
  technician: 'Khảo sát & Lắp đặt',
  sales: 'Báo giá & Hợp đồng',
  manager: 'Duyệt hồ sơ & KPI',
  admin: 'Hệ thống & Phân quyền',
}

const ENV_KEYS: Record<UserRole, { email: string; password: string }> = {
  customer: { email: 'VITE_DEMO_CUSTOMER_EMAIL', password: 'VITE_DEMO_CUSTOMER_PASSWORD' },
  technician: { email: 'VITE_DEMO_TECHNICIAN_EMAIL', password: 'VITE_DEMO_TECHNICIAN_PASSWORD' },
  sales: { email: 'VITE_DEMO_SALES_EMAIL', password: 'VITE_DEMO_SALES_PASSWORD' },
  manager: { email: 'VITE_DEMO_MANAGER_EMAIL', password: 'VITE_DEMO_MANAGER_PASSWORD' },
  admin: { email: 'VITE_DEMO_ADMIN_EMAIL', password: 'VITE_DEMO_ADMIN_PASSWORD' },
}

function readEnv(key: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Rỗng khi build production hoặc khi chưa khai báo biến môi trường nào */
export const demoAccounts: DemoAccount[] = import.meta.env.DEV
  ? USER_ROLES.flatMap((role) => {
      const keys = ENV_KEYS[role]
      const email = readEnv(keys.email)
      const password = readEnv(keys.password)
      if (!email || !password) return []
      return [{ role, roleLabel: ROLE_LABELS[role], description: DESCRIPTIONS[role], email, password }]
    })
  : []
