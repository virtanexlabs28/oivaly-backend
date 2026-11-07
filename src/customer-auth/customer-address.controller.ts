import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CustomerAddressService } from './customer-address.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('3. Customer — Address Book')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customer/addresses')
export class CustomerAddressController {
  constructor(private readonly addressService: CustomerAddressService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a new shipping address' })
  @ApiResponse({ status: 201, description: 'Address saved successfully' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customer saved addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.addressService.findAllForUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address details' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressService.findOneForUser(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a saved address' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(id, user.sub, dto);
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set address as primary default' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  async setDefault(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressService.setDefault(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved address' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressService.remove(id, user.sub);
  }
}
