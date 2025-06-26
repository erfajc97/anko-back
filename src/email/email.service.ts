import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  replacements: Record<string, string>;
}

interface PackagePurchaseEmailData {
  userEmail: string;
  userName: string;
  packageName: string;
  classCredits: number;
  expiryDate: string;
  price: number;
  transactionId: string;
}

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  private async getHtmlContent(
    templateName: string,
    replacements: Record<string, string>,
  ): Promise<string> {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'email',
      'templates',
      `${templateName}.html`,
    );
    let content = await fs.promises.readFile(templatePath, 'utf-8');

    for (const key in replacements) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, replacements[key]);
    }

    return content;
  }

  async sendEmail({ to, subject, templateName, replacements }: EmailOptions) {
    try {
      const html = await this.getHtmlContent(templateName, replacements);

      const { data, error } = await this.resend.emails.send({
        from: 'Anko <noreply@ankostudioec.com>',
        to: [to],
        subject,
        html,
      });

      if (error) {
        // En una app real, aquí usarías un logger más robusto
        console.error({ message: `Error sending email to ${to}`, error });
        throw error;
      }

      console.log({ message: `Email sent successfully to ${to}`, data });
      return data;
    } catch (error) {
      console.error(`Failed to send email: ${error.message}`);
      throw new Error('Failed to send email.');
    }
  }

  async sendPackagePurchaseEmail(data: PackagePurchaseEmailData) {
    const replacements = {
      userName: data.userName,
      packageName: data.packageName,
      classCredits: data.classCredits.toString(),
      expiryDate: data.expiryDate,
      price: data.price.toString(),
      transactionId: data.transactionId,
    };

    return this.sendEmail({
      to: data.userEmail,
      subject: '¡Paquete Adquirido Exitosamente! - Anko Studio',
      templateName: 'package-purchased',
      replacements,
    });
  }

  async sendContactFormEmail(data: {
    name: string;
    email: string;
    phone: string;
    message: string;
  }) {
    const to = this.configService.get<string>('CONTACT_RECEIVER_EMAIL');
    const replacements = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
    };
    return this.sendEmail({
      to,
      subject: 'Nuevo mensaje de contacto desde la landing',
      templateName: 'contact-form',
      replacements,
    });
  }
}
