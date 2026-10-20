// Viết tay, kiểu của API công khai provinces.open-api.vn v2 (tỉnh, phường/xã)

export type ProvinceWardRes = {
  name: string
  code: number
  /** "phường" | "xã" | "đặc khu" */
  division_type: string
  codename: string
  province_code: number
}

export type ProvinceWithWardsRes = {
  name: string
  code: number
  division_type: string
  codename: string
  phone_code: number
  wards: ProvinceWardRes[]
}
