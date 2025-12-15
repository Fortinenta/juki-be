import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/app.enum';

export const Public = () => SetMetadata('isPublic', true);
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
