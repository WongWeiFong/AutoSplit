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

  // async createBill(userId: string, dto: CreateBillDto) {
  //   await this.prisma.user.upsert({
  //     where: { id: userId },
  //     update: {},
  //     create: { id: userId },
  //   })

  //   return this.prisma.bill.create({
  //     data: {
  //       title: dto.title,
  //       merchantName: dto.merchantName,
  //       totalAmount: dto.totalAmount,
  //       createdBy: {
  //         connect: { id: userId },
  //       },
  //     },
  //   })
  // }


  
  
  // async addParticipants(
  //   billId: string,
  //   dto: {
  //     participants: {
  //       displayName: string
  //       userId?: string
  //       items: string[]
  //     }[]
  //   }
  // ) {
  //   return this.prisma.$transaction(async (tx) => {
  //     for (const p of dto.participants) {
  //       const participant = await tx.participant.create({
  //         data: {
  //           billId,
  //           displayName: p.displayName,
  //           userId: p.userId ?? null,
  //         },
  //       })
  
  //       if (p.items.length) {
  //         await tx.splitRule.createMany({
  //           data: p.items.map((itemId) => ({
  //             billId,
  //             participantId: participant.id,
  //             billItemId: itemId,
  //             type: 'EQUAL',
  //           })),
  //         })
  //       }
  //     }
  
  //     return tx.bill.findUnique({
  //       where: { id: billId },
  //       include: {
  //         items: true,
  //         participants: {
  //           include: { billSplit: true },
  //         },
  //       },
  //     })
  //   })
  // }
  

//   async createBill(userId: string, dto: CreateBillDto) {

//      /**
//    * STEP 0️⃣
//    * Ensure Supabase user exists in public.users
//    * This makes FK errors IMPOSSIBLE here
//    */
//   await this.prisma.user.upsert({
//     where: { id: userId },
//     update: {},
//     create: {
//       id: userId,
//     },
//   });
// try{
//     return this.prisma.$transaction(async (tx) => {

//       const user = await tx.user.findUnique({ where: { id: userId } });
//       if (!user) {
//         throw new Error(`User ${userId} not found`);
//       }
//       // 1️⃣ Create bill first
//       const bill = await tx.bill.create({
//         data: {
//           title: dto.title,
//           merchantName: dto.merchantName,
//           totalAmount: dto.totalAmount,
//           createdById: userId,
//         },
//       });
  
//       // 2️⃣ Create bill items
//       // if (dto.items?.length) {
//       const billItems = dto.items?.length
//         ? await tx.billItem.createMany({
//           data: dto.items.map((item) => ({
//             id : item.id,
//             billId: bill.id,
//             name: item.name,
//             quantity: item.quantity,
//             unitPrice: item.unitPrice,
//             totalPrice: item.totalPrice,
//             // description: item.description,
//           })),
//         })
//         : [];
      
  
//       // 3️⃣ Create participants + split rules
//       if (dto.participants?.length) {
//         for (const p of dto.participants) {
//           const participant = await tx.participant.create({
//             data: {
//               billId: bill.id,
//               displayName: p.displayName,
//               userId: p.userId ?? null,
//             },
//           });
  
//           if (p.  ?.length) {
//             await tx.billSplit.createMany({
//               data: p.billSplit.map((rule) => ({
//                 billId: bill.id,
//                 participantId: participant.id,
//                 billItemId: rule.billItemId,
//                 type: rule.type,
//                 amount: rule.amount ?? null,
//               })),
//             });
//           }
//         }
//       }
  
//       // 4️⃣ Return full bill
//       return tx.bill.findUnique({
//         where: { id: bill.id },
//         include: {
//           items: true,
//           participants: {
//             include: { billSplit: true },
//           },
//         },
//       });
//     });
//   } catch (error) {
//     console.error('Create bill error:',error);
//     throw new InternalServerErrorException(error);
//   }
//   }  
}
