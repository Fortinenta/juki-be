import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  constructor(private configService: ConfigService) {}

  /**
   * Send WhatsApp message using Fonnte API
   * Docs: https://fonnte.com/api
   */
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('FONNTE_API_KEY');
      
      if (!apiKey) {
        console.warn('FONNTE_API_KEY not configured. WhatsApp message not sent.');
        return false;
      }

      // Format phone number (remove +, spaces, etc)
      const formattedPhone = phone.replace(/[^0-9]/g, '');
      
      // Add country code if not present (Indonesia: 62)
      const phoneWithCountryCode = formattedPhone.startsWith('62') 
        ? formattedPhone 
        : `62${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}`;

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phoneWithCountryCode,
          message: message,
          countryCode: '62',
        }),
      });

      const result = await response.json();
      
      if (result.status) {
        console.log(`WhatsApp sent to ${phoneWithCountryCode}: Success`);
        return true;
      } else {
        console.error(`WhatsApp failed to ${phoneWithCountryCode}:`, result);
        return false;
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  /**
   * Send password reset notification
   */
  async sendPasswordReset(phone: string, fullName: string, newPassword: string): Promise<boolean> {
    const message = `Halo ${fullName},

Password akun JUKI Anda telah direset oleh admin.

Password baru Anda:
${newPassword}

Silakan login menggunakan password baru ini di:
http://juki-hub.rurustudio.cloud/

Untuk keamanan, segera ganti password Anda setelah login.

Terima kasih,
Tim JUKI`;

    return this.sendMessage(phone, message);
  }

  /**
   * Send training reminder
   */
  async sendTrainingReminder(phone: string, fullName: string, trainingTitle: string, trainingDate: string): Promise<boolean> {
    const message = `Halo ${fullName},

Reminder: Pelatihan Anda akan dimulai besok!

Judul: ${trainingTitle}
Tanggal: ${trainingDate}

Jangan lupa untuk hadir tepat waktu.

Terima kasih,
Tim JUKI`;

    return this.sendMessage(phone, message);
  }
}
