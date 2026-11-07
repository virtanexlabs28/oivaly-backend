import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({ description: 'Permission UUID to assign' })
  @IsUUID()
  permissionId: string;
}
