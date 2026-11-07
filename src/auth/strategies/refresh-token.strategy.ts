import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtRefreshPayload } from '../../common/types/auth.types.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_REFRESH_SECRET',
        'fallback-refresh-secret',
      ),
    });
  }

  validate(payload: JwtRefreshPayload): JwtRefreshPayload {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return payload;
  }
}
