import { Body, Controller, Put, Post, Req, UseGuards, Param, Delete } from '@nestjs/common';
import { SupabaseAuthGuard, GetUser } from '../auth/supabase-auth.guard';
import { BillsService } from './bills.service';
import { ConfirmBillDto } from './dto/confirm-bill.dto';

@Controller('bills')
@UseGuards(SupabaseAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  // @Post()
  // create(@Req() req, @Body() body: any) {
  //   const userId = req.user.id;
  //   return this.billsService.createBill(userId, body);
  // }

  @UseGuards(SupabaseAuthGuard)
  @Put(':billId/confirm')
  confirmBill(
    @Param('billId') billId: string,
    @Param('tripId') tripId: string,
    @Body() dto: ConfirmBillDto,
  ) {
    return this.billsService.confirmBill(billId, tripId, dto);
  }

  @Delete(':billId')
  async deleteBill(
    @Param('billId') billId: string, 
    @GetUser('id') userId: string) {
    return this.billsService.deleteBill(billId, userId);
  }
}