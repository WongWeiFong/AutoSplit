import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('test')
export class TestController {
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@Req() req) {
    return req.user;
  }
}
