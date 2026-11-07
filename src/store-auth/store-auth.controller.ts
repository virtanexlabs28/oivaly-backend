import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { StoreAuthService } from './store-auth.service.js';
import { StoreSignupDto } from './dto/store-signup.dto.js';
import { StoreLoginDto } from './dto/store-login.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('2. Seller / Store — Authentication & Onboarding')
@Controller('store-auth')
export class StoreAuthController {
  constructor(private readonly storeAuthService: StoreAuthService) {}

  @Public()
  @Get('verify-business-id')
  @ApiOperation({
    summary: 'Verify Finnish Business ID (Y-tunnus)',
    description: 'Queries PRH / YTJ open data to verify Finnish Business ID and return registered company details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification outcome with registered business metadata from PRH',
  })
  verifyBusinessId(@Query('businessId') businessId: string) {
    return this.storeAuthService.verifyBusinessId(businessId);
  }

  @Public()
  @Post('signup')
  @ApiOperation({
    summary: 'Vendor Signup & Store Application',
    description:
      'Registers a new vendor store administrator and submits a store application. Initial status will be set to UNDER_REVIEW.',
  })
  @ApiResponse({
    status: 201,
    description: 'Store application created successfully and placed under review',
  })
  @ApiResponse({
    status: 409,
    description: 'Email, Store Name, or Business ID already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or seller agreement was not accepted',
  })
  signup(@Body() dto: StoreSignupDto, @Req() req: Request) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.storeAuthService.signup(dto, ip, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Store Admin Login',
    description:
      'Authenticates a Store Administrator. Checks credentials, store assignment, and verifies the store is ACTIVE (or APPROVED). Rejects UNDER_REVIEW, REJECTED, and SUSPENDED stores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authenticated successfully. Returns access & refresh tokens with store info.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account is not a Store Admin',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: Store application is UNDER_REVIEW, REJECTED, or SUSPENDED',
  })
  login(@Body() dto: StoreLoginDto, @Req() req: Request) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.storeAuthService.login(dto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Store Admin Tokens',
    description: 'Generates new access & refresh tokens using a valid refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully. Returns new 7-day access & refresh tokens.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  refresh(@Body() body: { refreshToken: string }) {
    return this.storeAuthService.refreshSession(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get Authenticated Store Admin Profile',
    description:
      'Retrieves the current store admin user profile, store details, status, role, and assigned permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current Store Admin profile and store information',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'Store or user not found',
  })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.storeAuthService.getProfile(user.sub);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Seller / Store Admin Forgot Password',
    description: 'Generates password reset token and dispatches instructions.',
  })
  forgotPassword(@Body() body: { email: string }) {
    return this.storeAuthService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Seller / Store Admin Reset Password',
    description: 'Resets seller password using valid reset token.',
  })
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.storeAuthService.resetPassword(body.token, body.newPassword);
  }
}
