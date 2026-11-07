import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6g7h8i9j0', description: 'Reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecretPass123!', minLength: 8, description: 'New password' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
