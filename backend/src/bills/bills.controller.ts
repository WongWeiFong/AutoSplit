import { Body, Controller, Put, Post, Req, UseGuards, Param } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { BillsService } from './bills.service';
import { ConfirmBillDto } from './dto/confirm-bill.dto';

@Controller('bills')
@UseGuards(SupabaseAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  create(@Req() req, @Body() body: any) {
    const userId = req.user.id;
    return this.billsService.createBill(userId, body);
  }

  @UseGuards(SupabaseAuthGuard)
  @Put(':billId/confirm')
  confirmBill(
    @Param('billId') billId: string,
    @Body() dto: ConfirmBillDto,
  ) {
    return this.billsService.confirmBill(billId, dto);
  }

  
  // @UseGuards(SupabaseAuthGuard)
  // @Put(':billId/confirm')
  // confirmBill(
  //   @Param('billId') billId: string,
  //   @Req() req,
  //   @Body() body,
  // ) {
  //   return this.billsService.confirmBill(
  //     billId,
  //     req.user.id,
  //     body,
  //   )
  // }

}

