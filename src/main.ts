import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const apiPrefix = 'api';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set template engine
  app.setBaseViewsDir('src/templates');
  app.setViewEngine('hbs');

  // API Documentation
  const config = new DocumentBuilder()
    .setTitle('Auth Flow')
    .setDescription('Auth Flow API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'token',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, documentFactory);

  await app.listen(process.env.PORT ?? 5001);
}
bootstrap()
  .then(() => {
    console.log(
      `Server is running at: http://localhost:${process.env.PORT ?? 5001}`,
    );
    console.log(
      `API Documentation: http://localhost:${process.env.PORT ?? 5001}/${apiPrefix}/docs`,
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
