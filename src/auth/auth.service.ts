import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerificationToken } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; description: string }> {
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

      return {
        message: 'User registered successfully',
        description: 'User registered successfully',
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
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

      // Update user's email verification status
      await this.usersService.markEmailAsVerified(verificationToken.userId);

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

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    // Check if the user has a password (might be null for OAuth users)
    if (!user.password) {
      throw new UnauthorizedException(
        'This account cannot be accessed with password. Please use social login.',
      );
    }

    const isPasswordValid = bcrypt.compareSync(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Email not verified. A new verification token has been sent.',
      );
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { token } = refreshTokenDto;

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: {
        token,
      },
    });

    if (!refreshToken) {
      throw new BadRequestException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > refreshToken.expires) {
      await this.prisma.refreshToken.delete({
        where: {
          id: refreshToken.id,
        },
      });

      throw new BadRequestException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: refreshToken.userId,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(logoutDto: LogoutDto) {
    const { refreshToken } = logoutDto;

    const refreshTokenFromDb = await this.prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });

    if (!refreshTokenFromDb) {
      throw new BadRequestException('Invalid refresh token');
    }

    // Check if user is exists
    const user = await this.prisma.user.findUnique({
      where: {
        id: refreshTokenFromDb.userId,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    // Delete all related tokens of this user
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: refreshTokenFromDb.userId,
      },
    });

    return {
      message: 'Logged out successfully',
      description: 'Logged out successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      // Find user by email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        // For security reasons, always return success even if the email doesn't exist
        return {
          message: 'Password reset instructions sent',
          description:
            'If your email is registered, you will receive password reset instructions',
        };
      }

      // Delete any existing password reset tokens for this user
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
        },
      });

      // Generate a random 6-character token
      const resetToken = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      // Set token expiration time (15 minutes)
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);

      // Save the token in the database
      await this.prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          expires,
          userId: user.id,
        },
      });

      // Send password reset email
      await this.mailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName as string,
      );

      return {
        message: 'Password reset instructions sent',
        description:
          'If your email is registered, you will receive password reset instructions',
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, password } = resetPasswordDto;

      // Find the password reset token
      const passwordResetToken =
        await this.prisma.passwordResetToken.findUnique({
          where: {
            token,
          },
        });

      if (!passwordResetToken) {
        throw new BadRequestException({
          message: 'Invalid reset token',
          description: 'The password reset token is invalid or has expired',
        });
      }

      // Check if token is expired
      if (new Date() > passwordResetToken.expires) {
        // Delete the expired token
        await this.prisma.passwordResetToken.delete({
          where: {
            id: passwordResetToken.id,
          },
        });
        throw new BadRequestException({
          message: 'Token expired',
          description:
            'The password reset token has expired. Please request a new one.',
        });
      }

      // Hash the new password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Update the user's password
      await this.usersService.updatePassword(
        passwordResetToken.userId,
        hashedPassword,
      );

      // Delete all password reset tokens for this user
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: passwordResetToken.userId,
        },
      });

      // Delete all refresh tokens for this user to force re-login with the new password
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId: passwordResetToken.userId,
        },
      });

      return {
        message: 'Password reset successful',
        description:
          'Your password has been reset successfully. You can now login with your new password.',
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getCurrentUser(userId: string) {
    return await this.usersService.findById(userId);
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
      this.configService.get<string>(
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

  private async generateRefreshToken(userId: string): Promise<string> {
    // Delete any existing refresh tokens for this user that might be close to expiration
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expires: { lt: oneWeekAgo },
      },
    });

    const jwtToken = this.jwtService.sign(
      { userId },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d', // Refresh token expires in 7 days
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        token: jwtToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userId,
      },
    });

    return jwtToken;
  }

  private generateAccessToken(userId: string, email: string) {
    const payload = { sub: userId, email };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m', // Access token expires in 15 minutes
    });
  }
}
