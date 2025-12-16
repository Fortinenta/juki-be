import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

export interface RefreshPayload {
  sub: string;
  email: string;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        const header = req.headers.authorization;
        if (!header) return null;

        const [type, token] = header.split(' ');
        return type === 'Bearer' ? token : null;
      },
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshPayload) {
    const refreshToken = req.headers.authorization?.split(' ')[1];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    return {
      id: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
