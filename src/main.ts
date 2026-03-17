import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // only allow your frontend
    credentials: true, // 👈 required for cookies to work
  });

  // 1. Security headers — protects against common web vulnerabilities
  app.use(helmet());

  // 2. Cookie parser — reads cookies from requests
  app.use(cookieParser());

  // 3. Validation — validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips fields not in the DTO silently
      forbidNonWhitelisted: true, // rejects request if unknown fields are sent
      transform: true, // auto-converts types (e.g. string "1" → number 1)
    }),
  );

  // 4. Global exception filter — consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // 5. Global response interceptor — consistent success responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
  const url = await app.getUrl(); // 👈 gets the actual running URL
  console.log(`🚀 Server running on ${url}`);
}
bootstrap();
