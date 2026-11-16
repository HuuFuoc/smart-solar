/** Bỏ dấu và chữ hoa để tìm không phân biệt dấu ("ben thanh" khớp "Bến Thành") */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
