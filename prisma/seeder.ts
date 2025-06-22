import { PrismaClient, OrganizationMemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashData(data: string): Promise<string> {
  return bcrypt.hash(data, 10);
}

async function clearDatabase() {
  await prisma.$transaction(async (tx) => {
    await tx.organizationMembership.deleteMany();
    await tx.organization.deleteMany();
    await tx.user.deleteMany();
  });
}

async function main() {
  await clearDatabase();

  const ankoOrg = await prisma.organization.create({
    data: {
      name: 'Anko',
    },
  });

  const john = await prisma.user.create({
    data: {
      email: 'john.doe@mail.com',
      firstName: 'John',
      lastName: 'Doe',
      password: await hashData('qwerty'),
      type: 'ADMIN',
      telephone: '123456789',
      isVerified: true,
      memberships: {
        create: {
          organizationId: ankoOrg.id,
          role: OrganizationMemberRole.MANAGER,
        },
      },
    },
  });

  const jane = await prisma.user.create({
    data: {
      email: 'jane.doe@mail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: await hashData('qwerty'),
      type: 'USER',
      telephone: '123456789',
      isVerified: true,
      memberships: {
        create: {
          organizationId: ankoOrg.id,
          role: OrganizationMemberRole.MEMBER,
        },
      },
    },
  });

  console.log({ ankoOrg, john, jane });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
