export class ConfirmBillDto {
  tripId: string
  title: string
  merchantName?: string
  paidById: string

  bill: {
    subtotal: number
    tax: number
    taxPercentage: number
    totalDiscount: number
    rounding: number
    totalAmount: number
  }

  items: {
    tempItemId: string
    name: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
    totalPrice: number
    description?: string
  }[]

  participants: {
    id: string
    billId: string
    userId: string
    displayName: string
  }[]

  splits: {
    tempItemId: string
    billId: string
    userId: string
    amount: number
  }[]
}
