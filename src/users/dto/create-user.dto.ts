import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 8 chars)', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
