import { useQuery } from '@tanstack/react-query'

// Trang dùng dữ liệu mock đọc qua hook này. Có API thì thay queryFn
export function useMockQuery<T>(key: readonly unknown[], data: T, delay = 220) {
  return useQuery({
    queryKey: key,
    queryFn: () => new Promise<T>((resolve) => setTimeout(() => resolve(data), delay)),
    staleTime: Infinity,
  })
}
