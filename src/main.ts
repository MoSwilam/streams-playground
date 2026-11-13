import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

const SWAGGER_PATH = 'docs';

function setUpSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Streams learning project')
    .setDescription(
      'Each exercise has a **buffered** endpoint (loads everything into memory, already works) ' +
        'and a **streamed** one (you build it). Call both and compare the ' +
        '`[MemoryProbe] … peak RSS +X MB` lines in the server log. ' +
        'Restart the server between measurements: Node rarely gives memory back, so one request skews the next.',
    )
    .build();
  const createDocument = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, createDocument);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setUpSwagger(app);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Swagger UI: http://localhost:${port}/${SWAGGER_PATH}`);
}
await bootstrap();
