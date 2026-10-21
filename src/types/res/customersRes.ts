// Viết tay vì swagger không có schema response (tag Customers)

export type CreateCustomerProfileResponse = {
  /** Format: uuid */
  customerId: string
}

export type CreatePropertySiteResponse = {
  /** Format: uuid */
  propertySiteId: string
}
