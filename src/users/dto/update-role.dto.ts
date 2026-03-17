import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class UpdateRoleDto {
  @IsEnum(Role, { message: 'Role must be CUSTOMER, ADMIN or SUPER_ADMIN' })
  @IsNotEmpty()
  role: Role;
}
