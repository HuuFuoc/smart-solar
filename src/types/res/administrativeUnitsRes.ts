// Viết tay theo record C# của backend vì swagger của backend hiện không xuất được

/** Một phường, xã hoặc đặc khu đang hiệu lực (GET /api/administrative-units/communes) */
export type Commune = {
  /** 5 chữ số, giữ số 0 ở đầu */
  code: string
  name: string
  /** WARD | COMMUNE | SPECIAL_ZONE */
  unitType: string
  provinceCode: string
}
