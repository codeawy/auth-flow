import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

export default async function main() {
  await prisma.user.createMany({
    data: [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password',
      },
      {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'password',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
