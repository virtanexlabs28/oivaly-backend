import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { JwtPayload, JwtRefreshPayload } from '../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /admin/auth/login ─────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as platform admin' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Returns access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? undefined;
    const ua = req.headers['user-agent'] ?? undefined;
    return this.authService.login(dto.email, dto.password, ip, ua);
  }

  // ── POST /admin/auth/logout ────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (audit log only – client discards tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? undefined;
    const ua = req.headers['user-agent'] ?? undefined;
    await this.authService.logout(user.sub, ip, ua);
    return { message: 'Logged out successfully' };
  }

  // ── POST /admin/auth/refresh ───────────────────────────────────────────
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Returns new access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@CurrentUser() payload: JwtRefreshPayload) {
    return this.authService.refresh(payload);
  }

  // ── GET /admin/auth/me ─────────────────────────────────────────────────
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently authenticated admin' })
  @ApiResponse({ status: 200, description: 'Current user payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  // ── POST /admin/auth/change-password ──────────────────────────────────
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated admin' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? undefined;
    const ua = req.headers['user-agent'] ?? undefined;
    await this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
      ip,
      ua,
    );
    return { message: 'Password changed successfully' };
  }
}
