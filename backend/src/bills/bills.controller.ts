import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { BillsService } from './bills.service';

@Controller('bills')
@UseGuards(SupabaseAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  create(@Req() req, @Body() body: any) {
    const userId = req.user.id;
    return this.billsService.createBill(userId, body);
  }
}
