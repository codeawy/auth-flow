import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly prisma: PrismaService,
    private readonly ConfigService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const existingUser = await this.userService.findByEmail(
        registerDto.email,
      );

      if (existingUser) {
        throw new BadRequestException({
          message: 'User already exists',
          description: 'User with this email already exists',
        });
      }

      const hashedPassword = bcrypt.hashSync(
        registerDto.password as string,
        10,
      );

      const user = await this.userService.create({
        ...registerDto,
        password: hashedPassword,
      });

      const verificationToken = await this.createVerificationToken(user.id);

      await this.mailService.sendVerificationEmail(
        user.email,
        verificationToken.token,
        user.firstName as string,
      );

      return user;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async createVerificationToken(userId: string) {
    // ! be careful with this if you don't need to save all previous tokens
    await this.prisma.verificationToken.deleteMany({
      where: {
        userId,
      },
    });

    // Generate a 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const tokenExpireMinutes = parseInt(
      this.ConfigService.get<string>(
        'VERIFICATION_TOKEN_EXPIRY_MINUTES',
      ) as string,
      10,
    );

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + tokenExpireMinutes);

    return this.prisma.verificationToken.create({
      data: {
        token: verificationCode,
        expires,
        userId,
      },
    });
  }
}
