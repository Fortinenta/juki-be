import { Request } from 'express';

export type RequestWithUser = Request & {
  user: {
    userId: string;
    refreshToken?: string;
    [key: string]: any;
  };
};
