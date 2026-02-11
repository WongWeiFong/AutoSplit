import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [InvitesController],
  providers: [PrismaService],
})
export class InvitesModule {}
