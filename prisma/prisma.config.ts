// prisma/prisma.config.ts
import { defineConfig } from '@prisma/client/define';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' }); // Ensure .env is loaded for Prisma CLI

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
