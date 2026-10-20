import type { RouteObject } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { page } from '@/routes/lazyPage'
import { ROUTES } from '@/routes/paths'

/* Trang công khai, nạp khi vào route lần đầu (mỗi trang một chunk). */

// Website
const LandingPage = page(() => import('@/pages/public/LandingPage'), 'LandingPage')
const ComingSoonPage = page(() => import('@/pages/ComingSoonPage'), 'ComingSoonPage')
const ProductCatalogPage = page(() => import('@/pages/public/ProductCatalogPage'), 'ProductCatalogPage')
const ProductDetailPage = page(() => import('@/pages/public/ProductDetailPage'), 'ProductDetailPage')

// Xác thực
const LoginPage = page(() => import('@/pages/auth/LoginPage'), 'LoginPage')
const RegisterPage = page(() => import('@/pages/auth/RegisterPage'), 'RegisterPage')
const ForgotPasswordPage = page(() => import('@/pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage')
const ResetPasswordPage = page(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage')
const VerifyEmailPage = page(() => import('@/pages/auth/VerifyEmailPage'), 'VerifyEmailPage')
const ForbiddenPage = page(() => import('@/pages/ForbiddenPage'), 'ForbiddenPage')

// Chỉ ở dev
const StyleguidePage = page(() => import('@/pages/StyleguidePage'), 'StyleguidePage')

/* Route không cần đăng nhập: trang chủ, /coming-soon, /products, các màn xác thực, /403 và /styleguide. */
export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, lazy: LandingPage },
      { path: ROUTES.comingSoon, lazy: ComingSoonPage },
      { path: ROUTES.products, lazy: ProductCatalogPage },
      { path: ROUTES.product, lazy: ProductDetailPage },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.login, lazy: LoginPage },
      { path: ROUTES.register, lazy: RegisterPage },
      { path: ROUTES.forgotPassword, lazy: ForgotPasswordPage },
      { path: ROUTES.resetPassword, lazy: ResetPasswordPage },
      { path: ROUTES.verifyEmail, lazy: VerifyEmailPage },
      { path: ROUTES.forbidden, lazy: ForbiddenPage },
    ],
  },
  // Bảng mẫu component chỉ cho lúc phát triển: bản build không có route này (số liệu trong đó là mẫu).
  ...(import.meta.env.DEV ? [{ path: ROUTES.styleguide, lazy: StyleguidePage }] : []),
]
