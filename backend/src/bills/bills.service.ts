import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { CreateSplitRuleDto } from './dto/create-split-rule.dto';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBill(userId: string, dto: CreateBillDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Create bill first
      const bill = await tx.bill.create({
        data: {
          title: dto.title,
          merchantName: dto.merchantName,
          totalAmount: dto.totalAmount,
          createdById: userId,
        },
      });
  
      // 2️⃣ Create bill items
      if (dto.items?.length) {
        await tx.billItem.createMany({
          data: dto.items.map((item) => ({
            billId: bill.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            description: item.description,
          })),
        });
      }
  
      // 3️⃣ Create participants + split rules
      if (dto.participants?.length) {
        for (const p of dto.participants) {
          const participant = await tx.participant.create({
            data: {
              billId: bill.id,
              displayName: p.displayName,
              userId: p.userId ?? null,
            },
          });
  
          if (p.splitRules?.length) {
            await tx.splitRule.createMany({
              data: p.splitRules.map((rule) => ({
                billId: bill.id,
                participantId: participant.id,
                type: rule.type,
                amount: rule.amount ?? null,
              })),
            });
          }
        }
      }
  
      // 4️⃣ Return full bill
      return tx.bill.findUnique({
        where: { id: bill.id },
        include: {
          items: true,
          participants: {
            include: { splitRules: true },
          },
        },
      });
    });
  }  
}
