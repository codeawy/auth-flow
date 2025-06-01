import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  const apiPrefix = 'api';
  app.setGlobalPrefix(apiPrefix);

  await app.listen(process.env.PORT ?? 5001);
}
bootstrap()
  .then(() => {
    console.log('Server started on port', process.env.PORT ?? 5001);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
