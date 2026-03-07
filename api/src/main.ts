import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // await app.listen(3000);
  app.enableCors();
  await app.listen(5000);

  console.log('Backend is running on http://localhost:5000');
}
bootstrap();
