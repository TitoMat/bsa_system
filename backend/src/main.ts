// backend/src/main.ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import dataSource from './database/data-source';

async function runDevMigrations() {
  if (process.env.NODE_ENV === 'production') return;

  const logger = new Logger('DevMigrations');

  const initializedHere = !dataSource.isInitialized;

  try {
    if (initializedHere) {
      await dataSource.initialize();
    }

    const hasPendingMigrations = await dataSource.showMigrations();

    if (hasPendingMigrations) {
      logger.log(
        'Pending migrations found. Running local development migrations.',
      );
      await dataSource.runMigrations();
      logger.log('Local development migrations completed.');
    }
  } finally {
    if (initializedHere && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  await runDevMigrations();

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        reportOnly: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
        },
      },
    }),
  );

  const configuredPublicFormOrigins = String(
    process.env.PUBLIC_FORMS_ALLOWED_ORIGIN ?? '',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://10.18.80.9:8080',
    'http://10.18.80.9',
    ...configuredPublicFormOrigins,
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const logger = new Logger('Bootstrap');

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('BSA System API')
      .setDescription('Internal API documentation for BSA System')
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Use Authorization: Bearer <token>',
        },
        'bearer',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log('Swagger UI enabled at /api/docs');
  } else {
    logger.log('Swagger UI disabled (production)');
  }

  if (process.env.NODE_ENV === 'production') {
    const requiredSecrets = [
      'JWT_SECRET',
      'DATABASE_PASSWORD',
      'SIGNATURE_ENCRYPTION_KEY',
      'BSA_INTERNAL_API_KEY',
    ];
    const missing = requiredSecrets.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(', ')}`,
      );
    }
  }

  const port = Number(process.env.PORT || 8181);
  await app.listen(port);
}
bootstrap();
