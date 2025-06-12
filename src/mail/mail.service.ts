import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string, fistName?: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify your email',
        template: 'email-verification',
        context: {
          token,
          name: fistName ?? 'User',
          appName: this.configService.get<string>('APP_NAME'),
          verificationUrl: `${this.configService.get<string>(
            'FRONTEND_URL',
          )}/verify-email`,
          expiresIn: `${this.configService.get<string>(
            'VERIFICATION_TOKEN_EXPIRY_MINUTES',
          )} minutes`,
        },
      });
      this.logger.log('Verification email sent');
    } catch (error) {
      this.logger.error(error);
    }
  }
}
