import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('KenoBootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security Middleware & CORS
  app.use(helmet());
  app.enableCors({ origin: '*', credentials: true });

  // Support plain text & URL-encoded bodies for MacroDroid & SMS webhooks
  app.useBodyParser('text', { type: ['text/*', 'application/text'] });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Real-Money Keno Platform API')
    .setDescription(
      'Authoritative backend API for the certified real-money 80-ball Keno platform. Implements fixed paytable mathematics, independent CSPRNG, double-entry financial ledger, and server-side responsible gambling limits.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  logger.log(`Keno Authoritative API running on http://localhost:${port}`);
  logger.log(`OpenAPI Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
