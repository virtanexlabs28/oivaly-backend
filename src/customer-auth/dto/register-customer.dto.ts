import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'matti.meikalainen@example.fi', description: 'Customer email address' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'Pass12345!', minLength: 8, description: 'Customer password' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Matti Meikäläinen', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+358401234567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
