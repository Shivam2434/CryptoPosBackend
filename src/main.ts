// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : isDev
        ? true
        : false,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'x-api-key',
      'x-device-token',
      'x-organization-id',
      'idempotency-key',
    ],
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('CryptoPOS Multi-Tenant Payments Platform API')
    .setDescription(
      'Enterprise multi-tenant cryptocurrency point-of-sale and e-commerce payment platform API',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT Auth',
        description: 'Enter JWT Bearer token for Merchant Dashboard',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description:
          'Server/SDK secret or publishable API key (e.g. sk_live_..., pk_live_..., sk_test_...)',
      },
      'x-api-key',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-device-token',
        in: 'header',
        description: 'POS terminal device token (devtok_...)',
      },
      'x-device-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'CryptoPOS API Documentation',
  });

  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET ||
      process.env.JWT_SECRET.includes('change') ||
      process.env.JWT_SECRET.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET must be set to a strong unique value in production',
    );
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(
    `🚀 CryptoPOS Multi-Tenant Platform running on http://localhost:${port}`,
  );
  console.log(
    `📚 Interactive OpenAPI Swagger docs at http://localhost:${port}/api/docs`,
  );
  console.log(
    `⚡ WebSocket live gateway active at ws://localhost:${port}/payments`,
  );
}
bootstrap();
