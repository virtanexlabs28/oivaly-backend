import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role UUID to assign to the user',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('all', { message: 'roleId must be a valid UUID' })
  @IsNotEmpty({ message: 'roleId is required' })
  roleId: string;
}
