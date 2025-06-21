import { OrganizationMemberRole, UserType } from '@prisma/client';

export type LoggedInUserData = {
  id: string;
  email: string;
  type: UserType;
  orgs: {
    id: string;
    role: OrganizationMemberRole;
  }[];
};

export interface AuthenticatedRequest extends Request {
  user: LoggedInUserData;
}
