import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginCustomerDto {
  @ApiProperty({ example: 'matti.meikalainen@example.fi' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'Pass12345!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
