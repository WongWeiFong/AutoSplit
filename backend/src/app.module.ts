import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TestController } from './test/test.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BillsModule } from './bills/bills.module';

@Module({
  imports: [PrismaModule, BillsModule],
  // controllers: [AppController],
  // controllers: [],
  controllers: [TestController],
  providers: [],
  // providers: [AppService],
})
export class AppModule {}
