import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { OrganizationMemberRole, UserType } from '@prisma/client';
import { LoggedInUserData } from '../../interfaces/authenticated-user.interface';

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      OrganizationMemberRole[]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest();

    const user: LoggedInUserData = request.user;

    if (user.type === UserType.ADMIN) {
      return true;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    const organizationId =
      request.params.organizationId ||
      request.body.organizationId ||
      request.query.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Falta el organizationId en el request');
    }

    const foundOrg = user.orgs?.find((org) => org.id === organizationId);

    if (!foundOrg) {
      throw new ForbiddenException(
        'El usuario no pertenece a esta organizacion',
      );
    }

    if (!requiredRoles.includes(foundOrg.role)) {
      throw new ForbiddenException(
        `Acceso denegado: el rol del usuario es insuficiente`,
      );
    }

    return true;
  }
}
