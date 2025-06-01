import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/prisma';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaClient) {}

  getUserList() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isEmailVerified: true,
        provider: true,
        todos: {
          select: {
            id: true,
            title: true,
            completed: true,
            priority: true,
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
