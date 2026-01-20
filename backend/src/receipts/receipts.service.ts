// src/receipts/receipts.service.ts
import { Injectable } from '@nestjs/common';
import type { Express } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceiptsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: service role, not anon
  );

  constructor(private prisma: PrismaService) {}

  async processReceipt(
    file: Express.Multer.File,
    userId: string,
    billId: string,
  ) {
    // 1️⃣ Upload image
    const filePath = `${userId}/${crypto.randomUUID()}.jpg`;

    const { error } = await this.supabase.storage
      .from('receipts')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    const imageUrl = this.supabase.storage
      .from('receipts')
      .getPublicUrl(filePath).data.publicUrl;

    // 2️⃣ MOCK OCR output
    const rawOcrText = `
      Sushi World
      Salmon Sushi x4 80.00
      Tuna Roll x8 100.00
      TOTAL 180.00
    `;

    // 3️⃣ MOCK AI parsed result
    const aiParsedJson = {
      merchant: 'Sushi World',
      currency: 'MYR',
      total: 180,
      items: [
        { name: 'Salmon Sushi', quantity: 4, price: 80 },
        { name: 'Tuna Roll', quantity: 8, price: 100 },
      ],
    };

    // 4️⃣ Save receipt
    const receipt = await this.prisma.receipt.create({
      data: {
        billId,
        imageUrl,
        rawOcrText,
        aiParsedJson,
      },
    });
    console.log('STEP 1: Receipt created');    

    const parsed = aiParsedJson;
    console.log('AI parsed items:', parsed?.items);

    await this.prisma.$transaction(async (tx) => {
      // Delete old receipt(s) according to same bill Id
      await tx.receipt.deleteMany({
        where: { billId },
      });
    
      // Delete old bill items according to same bill Id
      await tx.billItem.deleteMany({
        where: { billId },
      });
    
      // Insert new receipt into receipt table
      const receipt = await tx.receipt.create({
        data: {
          billId,
          imageUrl,
          rawOcrText,
          aiParsedJson,
        },
      });
    
      // 4️⃣ Insert new bill items
      if (parsed?.items?.length) {
        await tx.billItem.createMany({
          data: parsed.items.map((item) => ({
            billId,
            name: item.name,
            quantity: item.quantity ?? 1,
            unitPrice: item.price / (item.quantity ?? 1),
            totalPrice: item.price,
          })),
        });
      }
    });

    return {
      message: 'Receipt uploaded (mock processed)',
      receiptId: receipt.id,
      imageUrl,
      rawOcrText,
      aiParsedJson,
    };
  }
}
