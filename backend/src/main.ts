import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { PrismaService } from './prisma/prisma.service';
import 'dotenv/config';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.VITE_FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });

  await app.init();
  return app.getHttpAdapter().getInstance();

  // const prismaService = app.get(PrismaService);
  // const users = await prismaService.user.findMany();
  // console.log('Users in database:', users);
  // console.log('Total users:', users.length);

  await app.listen(process.env.PORT ?? 3000);
  // console.log("abc", process.env.GOOGLE_APPLICATION_CREDENTIALS);
}
export default bootstrap();
