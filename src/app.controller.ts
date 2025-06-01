import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { User } from 'prisma/generated/prisma';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getUserList(): Promise<User[]> {
    return this.appService.getUserList();
  }
}
