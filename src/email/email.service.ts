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

interface AdminPackageNotificationData {
  userName: string;
  userEmail: string;
  userTelephone: string;
  userCedula: string;
  packageName: string;
  classCredits: number;
  price: number;
  transactionId: string;
  purchaseDate: string;
}

interface BookingConfirmationData {
  userEmail: string;
  userName: string;
  className: string;
  classDate: string;
  classTime: string;
  classDuration: string;
  teacherName: string;
  teacherSpecialty: string;
  bookingId: string;
}

interface BookingCancellationData {
  userEmail: string;
  userName: string;
  className: string;
  classDate: string;
  classTime: string;
  classDuration: string;
  teacherName: string;
  teacherSpecialty: string;
  bookingId: string;
}

interface AdminBookingNotificationData {
  userName: string;
  userEmail: string;
  userTelephone: string;
  userCedula: string;
  className: string;
  classDate: string;
  classTime: string;
  classDuration: string;
  teacherName: string;
  bookingId: string;
  bookingDate: string;
}

interface AdminBookingCancellationData {
  userName: string;
  userEmail: string;
  userTelephone: string;
  userCedula: string;
  className: string;
  classDate: string;
  classTime: string;
  classDuration: string;
  teacherName: string;
  bookingId: string;
  cancellationDate: string;
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

  async sendAdminPackageNotification(data: AdminPackageNotificationData) {
    const adminEmail = this.configService.get<string>('CONTACT_RECEIVER_EMAIL');

    const replacements = {
      userName: data.userName,
      userEmail: data.userEmail,
      userTelephone: data.userTelephone,
      userCedula: data.userCedula,
      packageName: data.packageName,
      classCredits: data.classCredits.toString(),
      price: data.price.toString(),
      transactionId: data.transactionId,
      purchaseDate: data.purchaseDate,
    };

    return this.sendEmail({
      to: adminEmail,
      subject: 'Nueva Adquisición de Paquete - Anko Studio',
      templateName: 'admin-package-notification',
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

  async sendBookingConfirmationEmail(data: BookingConfirmationData) {
    const replacements = {
      userName: data.userName,
      className: data.className,
      classDate: data.classDate,
      classTime: data.classTime,
      classDuration: data.classDuration,
      teacherName: data.teacherName,
      teacherSpecialty: data.teacherSpecialty,
      bookingId: data.bookingId,
    };

    return this.sendEmail({
      to: data.userEmail,
      subject: '¡Reserva Confirmada! - Anko Studio',
      templateName: 'booking-confirmation',
      replacements,
    });
  }

  async sendBookingCancellationEmail(data: BookingCancellationData) {
    const replacements = {
      userName: data.userName,
      className: data.className,
      classDate: data.classDate,
      classTime: data.classTime,
      classDuration: data.classDuration,
      teacherName: data.teacherName,
      teacherSpecialty: data.teacherSpecialty,
      bookingId: data.bookingId,
    };

    return this.sendEmail({
      to: data.userEmail,
      subject: 'Reserva Cancelada - Anko Studio',
      templateName: 'booking-cancellation',
      replacements,
    });
  }

  async sendAdminBookingNotification(data: AdminBookingNotificationData) {
    const adminEmail = this.configService.get<string>('CONTACT_RECEIVER_EMAIL');

    const replacements = {
      userName: data.userName,
      userEmail: data.userEmail,
      userTelephone: data.userTelephone,
      userCedula: data.userCedula,
      className: data.className,
      classDate: data.classDate,
      classTime: data.classTime,
      classDuration: data.classDuration,
      teacherName: data.teacherName,
      bookingId: data.bookingId,
      bookingDate: data.bookingDate,
    };

    return this.sendEmail({
      to: adminEmail,
      subject: 'Nueva Reserva Realizada - Anko Studio',
      templateName: 'admin-booking-notification',
      replacements,
    });
  }

  async sendAdminBookingCancellation(data: AdminBookingCancellationData) {
    const adminEmail = this.configService.get<string>('CONTACT_RECEIVER_EMAIL');

    const replacements = {
      userName: data.userName,
      userEmail: data.userEmail,
      userTelephone: data.userTelephone,
      userCedula: data.userCedula,
      className: data.className,
      classDate: data.classDate,
      classTime: data.classTime,
      classDuration: data.classDuration,
      teacherName: data.teacherName,
      bookingId: data.bookingId,
      cancellationDate: data.cancellationDate,
    };

    return this.sendEmail({
      to: adminEmail,
      subject: 'Reserva Cancelada - Anko Studio',
      templateName: 'admin-booking-cancellation',
      replacements,
    });
  }
}
