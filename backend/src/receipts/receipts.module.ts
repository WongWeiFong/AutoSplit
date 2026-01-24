import { Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
  ],
  providers: [ReceiptsService],
  controllers: [ReceiptsController]
})
export class ReceiptsModule {}
