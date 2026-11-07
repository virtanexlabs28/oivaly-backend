import {
  Controller,
  Post,
  Get,
  Patch,
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
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CustomerAuthService } from './customer-auth.service.js';
import { RegisterCustomerDto } from './dto/register-customer.dto.js';
import { LoginCustomerDto } from './dto/login-customer.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto.js';

import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('3. Customer — Identity & Account')
@Controller('customer/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'Customer registered; verification email sent' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterCustomerDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.customerAuthService.register(dto, ip, ua);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as customer' })
  @ApiResponse({ status: 200, description: 'Returns access + refresh tokens and profile' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or suspended account' })
  async login(@Body() dto: LoginCustomerDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.customerAuthService.login(dto, ip, ua);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.customerAuthService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification token' })
  async resendVerification(@Body('email') email: string) {
    return this.customerAuthService.resendVerification(email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token via email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.customerAuthService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.customerAuthService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current customer profile with address book' })
  @ApiResponse({ status: 200, description: 'Customer profile details' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.customerAuthService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update customer personal profile' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerAuthService.updateProfile(user.sub, dto);
  }
}
