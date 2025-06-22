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
    await tx.classPackage.deleteMany();
  });
}

async function main() {
  await clearDatabase();

  console.log('Seeding class packages...');
  const packagesData = [
    { name: 'ANKO PASS', price: 16, classCredits: 1, validityDays: 15 },
    { name: 'WELLNESS PACK', price: 59, classCredits: 4, validityDays: 30 },
    { name: 'STRONG PACK', price: 110, classCredits: 8, validityDays: 30 },
    { name: 'GROW PACK', price: 153, classCredits: 12, validityDays: 30 },
    { name: 'EXTRA PACK', price: 190, classCredits: 16, validityDays: 30 },
    { name: 'UNLIMITED PACK', price: 233, classCredits: 20, validityDays: 30 },
  ];

  await prisma.classPackage.createMany({
    data: packagesData,
  });
  console.log('Class packages seeded.');

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
