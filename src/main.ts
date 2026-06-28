import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ensure 'uploads' directory exists
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log(`[Bootstrap] Created directory: ${uploadsDir}`);
  }

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Bootstrap] NestJS dating backend running on: http://localhost:${port}`);
}
bootstrap();
