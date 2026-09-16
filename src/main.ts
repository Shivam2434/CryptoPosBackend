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
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3001',
      'http://localhost:8081',
      'http://localhost:19006',
    ],
    credentials: true,
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
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
