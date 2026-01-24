import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TestController } from './test/test.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BillsModule } from './bills/bills.module';
import { ConfigModule } from '@nestjs/config';
import { ReceiptsModule } from './receipts/receipts.module';
import { SupabaseModule } from './supabase/supabase.module';


@Module({
  imports: [PrismaModule, BillsModule, ConfigModule.forRoot({
    isGlobal: true,
  }), ReceiptsModule, SupabaseModule],
  // controllers: [AppController],
  // controllers: [],
  controllers: [TestController],
  providers: [],
  // providers: [AppService],
})

export class AppModule {}
