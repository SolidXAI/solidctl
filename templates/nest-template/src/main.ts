// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(3000);
// }
// bootstrap();
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { buildDefaultCorsOptions, buildDefaultSecurityHeaderOptions, buildPermissionsPolicyHeader, WrapResponseInterceptor } from '@solidxai/core';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { configurePgInt8TypeParser } from './database.utils';

import qs from 'qs';

// ---- Global safety nets (must be first) ----
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function bootstrap() {
  const appModule = await AppModule.forRoot();
  const app = await NestFactory.create(appModule);

  // Enable Helmet middleware for security
  app.use(helmet(buildDefaultSecurityHeaderOptions()));

  // Enable Permission policy header
  app.use((req: Request, _res: Response, next: NextFunction) => {
    _res.setHeader('Permissions-Policy', buildPermissionsPolicyHeader({
      // Example overrides:
      // "autoplay": ['self', 'https://player.example.com'],
      // "camera": 'none',
    }));
    next();
  });

  // setup winston as the default logger.
  // const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Making the port dynamic
  const port = process.env.PORT || 3000;

  app.setGlobalPrefix('api');
  // Middleware to parse deeply nested queries
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.query) {
      req.query = qs.parse(req.url.split('?')[1], {
        allowDots: true,  // Allows dot notation ($eq, $or, etc.)
        depth: 10,        // Supports deeply nested structures
        arrayLimit: 100,  // Prevents indexed arrays from becoming objects
      });
    }
    next();
  });

  // Apply the ValidationPipe globally in our main.ts file
  app.useGlobalPipes(new ValidationPipe({
    // This attribute makes that the system throws an error if a property non existent on our DTO is sent in the payload.
    // forbidNonWhitelisted: true,

    // This removes the un-necessary fields in the payload. 
    // whitelist: true,

    // Converts the payload to an actual instance of the DTO type.
    transform: true,

    transformOptions: {
      enableImplicitConversion: true,
    }
  }));

  // Setting up Swagger document 
  const options = new DocumentBuilder()
    .setTitle('Solid Starters')
    .setDescription('Solid starters starter')
    .setVersion('1.0')
    .setExternalDoc('Postman Collection', '/docs-json')
    .addBearerAuth(
      {
        // I was also testing it without prefix 'Bearer ' before the JWT
        description: `Please enter token in following format: Bearer <JWT>`,
        name: 'Authorization',
        bearerFormat: 'Bearer', // I`ve tested not to use this field, but the result was the same
        scheme: 'Bearer',
        type: 'http', // I`ve attempted type: 'apiKey' too
        in: 'Header'
      },
      'jwt'
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document);

  // Apply interceptor...
  app.useGlobalInterceptors(
    new WrapResponseInterceptor(),
  );

  app.enableCors(buildDefaultCorsOptions());

  configurePgInt8TypeParser();

  await app.listen(port);
}
bootstrap();
