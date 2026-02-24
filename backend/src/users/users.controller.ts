import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getMe(@GetUser() user: any) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  updateMe(@GetUser() user: any, @Body('name') name: string) {
    return this.usersService.updateMe(user.id, name);
  }
}