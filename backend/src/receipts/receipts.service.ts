import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReceiptsService {
  private genAI: GoogleGenerativeAI;

  private async preprocessImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .grayscale()
      .normalize()
      .resize({ width: 1800 }) // upscale improves small fonts
      .threshold(150)          // makes text pop
      .toBuffer();
  }

  constructor(
    private readonly prisma: PrismaService, 
    private readonly supabaseService: SupabaseService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async uploadAndProcessReceipt(
    file: Express.Multer.File,
    userId: string,
    tripId: string,
  ) {
    console.log('received tripid:', tripId)
    try {
      // 0️⃣ Ensure user exists (FK safe)
      await this.prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });

      // 1️⃣ Create Bill
      const bill = await this.prisma.bill.create({
        data: {
          title: 'Receipt Upload',
          paidBy:{
            connect: {
              id: userId,
            },
          },
          trip: {
            connect: {
              id: tripId,
            },
          },
          createdBy: {
            connect: {
              id: userId,
            },
          },
        },
      });

      // 2️⃣ Create Receipt row
      const receipt = await this.prisma.receipt.create({
        data: {
          billId: bill.id,
        },
      });

      // 3️⃣ OCR (BUFFER, not path)
      const rawText = await this.runTesseract(file.buffer);

      // 4️⃣ Gemini AI cleanup
      const aiJson = await this.processWithGemini(rawText);


      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}/${uuid()}.${fileExt}`;
      const { error } = await this.supabaseService.storage
      .from('receipts')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error('Failed to upload receipt image');
    }

    const { data } = this.supabaseService.storage
      .from('receipts')
      .getPublicUrl(fileName);
      const imageUrl = data.publicUrl ?? null;

      // const { data } = await this.supabaseService.storage
      // .from('receipts')
      // .createSignedUrl(fileName, 60 * 60);
      // const imageUrl = data?.signedUrl ?? null; 

      // 5️⃣ Save OCR + AI result
      await this.prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          imageUrl,
          rawOcrText: rawText,
          aiParsedJson: aiJson,
        },
      });

      return {
        billId: bill.id,
        parsedData: aiJson,
      };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Receipt processing failed');
    }
  }

  // =========================
  // OCR WITH TESSERACT
  // =========================
  private async runTesseract(imageBuffer: Buffer): Promise<string> {
    const processed = await this.preprocessImage(imageBuffer);
    const worker = await Tesseract.createWorker('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
    });
    
    await worker.reinitialize('eng');
    await worker.recognize(processed);
    try {
      const {
        data: { text },
      } = await worker.recognize(imageBuffer);

      return text;
    } finally {
      await worker.terminate();
    }
  }

  // GEMINI AI PROCESSING
  private async processWithGemini(rawText: string): Promise<any> {
    const model = this.genAI.getGenerativeModel({
      // model: 'gemini-2.0-flash', // DISCONTINUED
      // model: 'gemini-2.5-flash-lite', // higher accuracy but slower
      // model: 'gemini-2.5-flash', // lesser accuracy but faster
      // model: 'gemini-2.5-pro'
      model: 'gemini-3-flash-preview', // higher accuracy and slightly faster than 2.5-flash
      // model: 'gemini-3-pro-preview',
    });

    const prompt = `
You are a receipt understanding engine.

The OCR text below might be noisy and imperfect.
Ignore payment terminal data, card numbers, approvals, batch numbers, and merchant footer text.

Focus ONLY on:
- Items name such as food, drinks, goods, etc. Anything could be included in the item name as the receipt could be from different merchants.
- Quantities
- Discounts (negative prices)
- Subtotal
- Total paid

Rules:
- Discounts are items with negative prices
- Items without prices written belongs to previous item, it must be written in description/details of the previous item
- Items have a price with negative value, is a discount of the previous item, it should be marked it as details/description of the items
- Item's description/details should be written in description field, each description should be separated by a new line
- Infer quantities if missing, if the quantity is not mentioned, assume it is 1
- Ignore VISA / APPROVED / CARD / BATCH / MID / RREF
- Ignore address lines
- Ignore Telephone numbers, email addresses, Merchant's details except for the name
- For discounts, please add the negative value to the total amount
- For tax, please add the (tax + service charges) to the total amount

Return JSON in this format ONLY:
{
  "merchantName": string | null,
  "items": [
    {
      "name": string,
      "quantity": number,
      "unitPrice": number | 0,
      "discount": number | 0,
      "totalPrice": number,
      "description": string | 'No description',
    }
  ],
  "subtotal": number | no,
  "tax": number | 0,
  "totalDiscount": number | 0,
  "rounding": +number | -number | 0,
  "totalAmount": number | no
}

OCR TEXT:
${rawText}
`;


    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      return JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('Gemini returned invalid JSON');
      }
      return JSON.parse(match[0]);
    }
  }
}
