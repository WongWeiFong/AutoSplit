export class ConfirmBillDto {
    title: string;
    merchantName?: string;
    subtotal?: number;
    tax?: number;
    totalDiscount: number;
    rounding?: number;
    totalAmount: number;
  
    items: {
      id: string;
      name: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
      discount: number | 0;
      description?: string;
    }[];
  }
  