import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ReceiptsService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly prisma: PrismaService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async uploadAndProcessReceipt(
    file: Express.Multer.File,
    userId: string,
  ) {
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
          createdById: userId,
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

      // 5️⃣ Save OCR + AI result
      await this.prisma.receipt.update({
        where: { id: receipt.id },
        data: {
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
    const worker = await Tesseract.createWorker('eng');

    try {
      const {
        data: { text },
      } = await worker.recognize(imageBuffer);

      return text;
    } finally {
      await worker.terminate();
    }
  }

  // =========================
  // GEMINI AI PROCESSING
  // =========================
  private async processWithGemini(rawText: string): Promise<any> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `
You are a receipt parser.

From the OCR text below, extract:
- merchantName
- items: [{ name, quantity, unitPrice, totalPrice }]
- totalAmount

Return ONLY valid JSON.

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
