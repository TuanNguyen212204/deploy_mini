import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';           
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,           
    })
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('PriceHawk API')
    .setDescription('API cho hệ thống so sánh giá Shopee - Lazada - TikTok')
    .setVersion('1.0')
    .addTag('Products')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);   // Truy cập: http://localhost:3000/api

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();