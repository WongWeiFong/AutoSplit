import { Injectable, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { CreateSplitRuleDto } from './dto/create-split-rule.dto';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBill(userId: string, dto: CreateBillDto) {

     /**
   * STEP 0️⃣
   * Ensure Supabase user exists in public.users
   * This makes FK errors IMPOSSIBLE here
   */
  await this.prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
    },
  });
try{
    return this.prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
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
      // if (dto.items?.length) {
      const billItems = dto.items?.length
        ? await tx.billItem.createMany({
          data: dto.items.map((item) => ({
            id : item.id,
            billId: bill.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            // description: item.description,
          })),
        })
        : [];
      
  
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
                billItemId: rule.billItemId,
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
  } catch (error) {
    console.error('Create bill error:',error);
    throw new InternalServerErrorException(error);
  }
  }  
}
