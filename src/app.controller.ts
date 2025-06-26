import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from './email/email.service';
import { Public } from './auth/decorators/public.decorator';

@Controller('')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('contact')
  async contact(
    @Body()
    body: {
      name: string;
      email: string;
      phone: string;
      message: string;
    },
  ) {
    await this.emailService.sendContactFormEmail(body);
    return { message: 'Mensaje enviado correctamente' };
  }
}
