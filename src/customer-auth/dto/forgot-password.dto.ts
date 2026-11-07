import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'matti.meikalainen@example.fi' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;
}
