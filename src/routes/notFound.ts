// Ném Response 404 cho errorElement gốc bắt
export function notFound(message = 'Không tìm thấy trang'): never {
  throw new Response(message, { status: 404, statusText: 'Not Found' })
}
