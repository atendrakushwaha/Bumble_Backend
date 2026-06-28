import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
import * as dns from 'dns';

async function bootstrap() {
  // 🔥 FIX: MongoDB SRV/DNS issue (important for your error)
  dns.setServers(['8.8.8.8', '1.1.1.1']);

  const app = await NestFactory.create(AppModule);

  // ----------------------------
  // Uploads folder setup
  // ----------------------------
  const uploadsDir = join(__dirname, '..', 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[Bootstrap] Created uploads directory: ${uploadsDir}`);
  }

  // Serve static files
  app.use('/uploads', express.static(uploadsDir));

  // ----------------------------
  // CORS CONFIG (Chat apps friendly)
  // ----------------------------
  app.enableCors({
    origin: true, // allow all origins (dev mode)
    credentials: true,
  });

  // ----------------------------
  // Global Validation Pipe
  // ----------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ----------------------------
  // Start Server
  // ----------------------------
  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(
    `[Bootstrap] 🚀 Server running at: http://localhost:${port}`,
  );
}

bootstrap();