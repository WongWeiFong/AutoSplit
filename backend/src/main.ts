import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import http from 'http';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    // for prod
    new ExpressAdapter(server),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  //for dev
  // await app.listen(3000);

  //for prod
  await app.init();
  const port = process.env.PORT || 3000;
  http.createServer(server).listen(port as number, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

bootstrap();

export default server;
