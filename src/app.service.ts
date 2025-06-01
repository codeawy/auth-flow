import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/prisma';
import { User } from 'prisma/generated/prisma';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaClient) {}

  getUserList(): Promise<User[]> {
    return this.prisma.user.findMany();
  }
}
