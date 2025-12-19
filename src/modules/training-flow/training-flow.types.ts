import { UserRole } from '@prisma/client'; // Fix import setelah prisma generate

export interface TransitionContext {
  userId: number;
  actorRole: UserRole; // Ganti ke UserRole
  data?: Record<string, unknown>; // Fix any ke Record untuk flexible data
}
