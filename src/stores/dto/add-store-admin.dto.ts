import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStoreAdminDto {
  @ApiProperty({ description: 'UUID of the user to grant store admin access to' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
