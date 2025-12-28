import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdateSettingsDto {
  payment_bank_name?: string;
  payment_account_number?: string;
  payment_account_name?: string;
  payment_amount?: string;
  admin_form_link?: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all public settings
   * Transforms array of configs into a single object
   */
  async getSettings() {
    const configs = await this.prisma.systemConfig.findMany();
    
    // Reduce array to object { key: value }
    const settings = configs.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return settings;
  }

  /**
   * Update settings (Upsert)
   * Handles multiple updates in transaction
   */
  async updateSettings(dto: UpdateSettingsDto) {
    const updates = Object.entries(dto).map(([key, value]) => {
      if (value !== undefined) {
        return this.prisma.systemConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { 
            key, 
            value: String(value),
            description: this.getDescriptionForKey(key)
          },
        });
      }
      return null;
    }).filter(Boolean); // Remove nulls

    await this.prisma.$transaction(updates as any[]);
    
    return this.getSettings();
  }

  private getDescriptionForKey(key: string): string {
    const descriptions: Record<string, string> = {
      payment_bank_name: 'Nama Bank Tujuan Pembayaran',
      payment_account_number: 'Nomor Rekening Tujuan',
      payment_account_name: 'Nama Pemilik Rekening',
      payment_amount: 'Nominal Pembayaran Pelatihan',
      admin_form_link: 'Link Google Form Administratif',
    };
    return descriptions[key] || 'System Configuration';
  }
}
