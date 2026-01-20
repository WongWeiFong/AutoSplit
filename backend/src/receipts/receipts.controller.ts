import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    Body,
    Req,
    UseGuards,
    Module
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { ReceiptsService } from './receipts.service';
  import { SupabaseAuthGuard } from '../auth/supabase-auth.guard'; // your guard path
  import type { Request } from 'express'; // <-- for type of req
  
  @Controller('receipts')
  export class ReceiptsController {
    constructor(private readonly receiptsService: ReceiptsService) {}
  
    // src/receipts/receipts.controller.ts
@Post('upload')
@UseGuards(SupabaseAuthGuard)
@UseInterceptors(FileInterceptor('file'))
uploadReceipt(
  @UploadedFile() file: Express.Multer.File,
  @Req() req,
  @Body('billId') billId: string,
) {
  return this.receiptsService.processReceipt(
    file,
    req.user.id,
    billId,
  );
}

  }
  