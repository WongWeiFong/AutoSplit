import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TestController } from './test/test.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BillsModule } from './bills/bills.module';
import { ConfigModule } from '@nestjs/config';
import { ReceiptsModule } from './receipts/receipts.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { InvitesModule } from './invites/invites.module';

@Module({
  imports: [PrismaModule, BillsModule, TripsModule, InvitesModule, ConfigModule.forRoot({
    isGlobal: true,
  }), ReceiptsModule, SupabaseModule, UsersModule],
  controllers: [TestController],
  providers: [],
  // providers: [AppService],
})

export class AppModule {}
