import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('receipts')
@UseGuards(SupabaseAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body('tripId') tripId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt image file is required');
    }

    const userId = req.user.id;
    return this.receiptsService.uploadAndProcessReceipt(
      file,
      userId,
      tripId,
    );
  }
}
