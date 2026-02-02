import { Injectable, InternalServerErrorException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
// import { CreateParticipantDto } from './dto/create-participant.dto';
// import { CreateBillSplitDto } from './dto/create-bill-split.dto';
import { ConfirmBillDto } from './dto/confirm-bill.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async confirmBill(billId: string, tripId : String, dto: ConfirmBillDto) {
    return this.prisma.$transaction(async (tx) => {

      // 1️⃣ Update bill summary
      await tx.bill.update({
        where: { id: billId },
        data: {
          paidById: dto.paidById,
          title: dto.title,
          merchantName: dto.merchantName,
          tripId: dto.tripId,
          subtotal: dto.bill.subtotal,
          tax: dto.bill.tax,
          totalDiscount: dto.bill.totalDiscount,
          rounding: dto.bill.rounding,
          totalAmount: dto.bill.totalAmount,
        },
      })

      // 2️⃣ Clear old data
      await tx.billSplit.deleteMany({ where: { billId } })
      await tx.participant.deleteMany({ where: { billId } })
      await tx.billItem.deleteMany({ where: { billId } })

      // 3️⃣ Insert items
      await tx.billItem.createMany({
        data: dto.items.map(item => ({
          billId,
          clientItemId: item.tempItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.totalPrice,
          description: item.description,
        })),
      })

      // 4️⃣ Fetch inserted items & map by name (or index)
      const billItems = await tx.billItem.findMany({ where: { billId } })
      const itemMap = new Map(
        billItems.map(i => [i.clientItemId, i.id])
      )

      // 5️⃣ Insert participants (snapshot)
      await tx.participant.createMany({
        data: dto.participants.map(p => ({
          billId,
          userId: p.userId,
          displayName: p.displayName,
        })),
      })

      // 6️⃣ Validate splits
      for (const item of dto.items) {
        const sum = dto.splits
          .filter(s => s.tempItemId === item.tempItemId)
          .reduce((a, b) => a + b.amount, 0)

          if (Math.abs(sum - item.totalPrice) !== 0) {
          throw new Error(`Split mismatch for item ${item.name}` + sum + "sum more than totalPrice" + item.totalPrice)
        // } else if (Math.abs(sum - item.totalPrice) <= 0.01) {
        //   throw new Error(`Split mismatch for item ${item.name}` + sum + "sum lesser than totalPrice" + item.totalPrice)
        }
      }

      // 7️⃣ Insert splits (FINAL, CORRECT)
      await tx.billSplit.createMany({
        data: dto.splits.map(s => ({
          billId,
          billItemId: itemMap.get(s.tempItemId)!,
          userId: s.userId,
          amount: s.amount,
        })),
      })

      return { billId }
    })
  }

  async getBill(billId: string) {
    return this.prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: true,
        participants: true,
        splits: true,
        paidBy: true,
        receipt: {
          select: {
            imageUrl: true,
          },
        }
      },
    });
  }

  async deleteBill(billId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Check ownership or trip membership first
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new NotFoundException('Bill not found');
  
      // 2. Delete related records (has FK table)
      await tx.billSplit.deleteMany({ where: { billId } });
      await tx.participant.deleteMany({ where: { billId } });
      await tx.billItem.deleteMany({ where: { billId } });
      await tx.receipt.deleteMany({ where: { billId } });
  
      // delete  bill
      return tx.bill.delete({
        where: { id: billId },
      });
    });
  }
}