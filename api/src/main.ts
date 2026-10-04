import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  // Swagger UI at /docs: a dev tool to try the endpoints.
  // Request schemas come from the DTO classes via the Nest CLI plugin (nest-cli.json).
  const config = new DocumentBuilder()
    .setTitle('Kiosk API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
