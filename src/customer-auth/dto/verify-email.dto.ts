import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6g7h8i9j0', description: 'Hex or UUID email verification token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
