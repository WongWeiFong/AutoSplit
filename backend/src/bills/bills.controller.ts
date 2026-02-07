import { Body, Controller, Put, Post, Req, UseGuards, Param, Delete, Get, NotFoundException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { BillsService } from './bills.service';
import { ConfirmBillDto } from './dto/confirm-bill.dto';

@Controller('bills')
@UseGuards(SupabaseAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Put(':billId/confirm')
  confirmBill(
    @Param('billId') billId: string,
    @Param('tripId') tripId: string,
    @Body() dto: ConfirmBillDto,
  ) {
    return this.billsService.confirmBill(billId, tripId, dto);
  }

  @Get(':billId')
  async getBill(@Param('billId') billId: string) {
    const bill = await this.billsService.getBill(billId);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    return bill;
  }

  @Delete(':billId')
  async deleteBill(
    @Param('billId') billId: string, 
    @GetUser('id') userId: string) {
    return this.billsService.deleteBill(billId, userId);
  }
}