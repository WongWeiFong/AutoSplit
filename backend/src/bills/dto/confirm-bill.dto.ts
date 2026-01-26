export class ConfirmBillDto {
  title: string
  merchantName?: string

  bill: {
    subtotal: number
    tax: number
    totalDiscount: number
    rounding: number
    totalAmount: number
  }

  items: {
    id: string
    name: string
    quantity: number
    unitPrice: number
    discount: number
    totalPrice: number
    description?: string
  }[]

  participants: {
    id: string
    displayName: string
  }[]

  splits: {
    participantId: string
    itemId: string
    amount: number
  }[]
}
