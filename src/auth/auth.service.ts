import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerificationToken } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly ConfigService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const existingUser = await this.usersService.findByEmail(
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

      const user = await this.usersService.create({
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

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    try {
      const { token } = verifyEmailDto;

      const verificationToken = await this.prisma.verificationToken.findUnique({
        where: {
          token,
        },
      });

      if (!verificationToken) {
        throw new BadRequestException({
          message: 'Invalid verification token',
          description: 'Verification token is invalid or expired',
        });
      }

      if (new Date() > verificationToken.expires) {
        await this.prisma.verificationToken.delete({
          where: {
            id: verificationToken.id,
          },
        });
        throw new BadRequestException({
          message: 'Verification token expired',
          description: 'Verification token is expired',
        });
      }

      // Update user's email verification status
      await this.usersService.markEmailAsVerified(verificationToken.userId);

      // Delete the used token
      await this.prisma.verificationToken.delete({
        where: {
          id: verificationToken.id,
        },
      });

      return {
        message: 'Email verified successfully',
        description:
          'Email verification completed successfully, You can now login',
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resendVerificationEmail(resendVerificationDto: ResendVerificationDto) {
    try {
      const { email } = resendVerificationDto;

      // Find user by email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new BadRequestException('Email not registered');
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        return { message: 'Email is already verified' };
      }

      // Find existing verification token
      const existingToken = await this.prisma.verificationToken.findFirst({
        where: {
          userId: user.id,
          expires: {
            gt: new Date(),
          },
        },
      });

      let verificationToken: VerificationToken;

      if (existingToken) {
        verificationToken = existingToken;
      } else {
        verificationToken = await this.createVerificationToken(user.id);
      }

      await this.mailService.sendVerificationEmail(
        user.email,
        verificationToken.token,
        user.firstName as string,
      );

      return {
        message: 'Verification email sent successfully',
        description: 'Verification email sent successfully',
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
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
