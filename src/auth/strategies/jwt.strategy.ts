import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../../common/types/auth.types.js';
import { User } from '../../users/entities/user.entity.js';
import { UserStatus } from '../../users/enums/user-status.enum.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    // Return the payload as-is (it already contains permissions embedded at login)
    return payload;
  }
}
