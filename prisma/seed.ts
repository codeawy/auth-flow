import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export default async function main() {
  // await prisma.user.createMany({
  //   data: Array.from({ length: 25 }, () => ({
  //     firstName: faker.person.firstName(),
  //     lastName: faker.person.lastName(),
  //     email: faker.internet.email(),
  //     password: faker.internet.password(),
  //     isEmailVerified: faker.datatype.boolean(),
  //     provider: faker.helpers.arrayElement([
  //       'EMAIL_PASSWORD',
  //       'GOOGLE',
  //       'GITHUB',
  //     ]),
  //   })),
  // });
  // await prisma.todo.createMany({
  //   data: Array.from({ length: 10 }, () => ({
  //     title: faker.lorem.sentence(),
  //     description: faker.lorem.paragraph(),
  //     completed: faker.datatype.boolean(),
  //     priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
  //     userId: faker.helpers.arrayElement([
  //       // TODO: after migration you should get users ids from db
  //       'f0ee13d8-3ab0-4a4f-9119-72db8d8290eb',
  //       '082f57a7-895b-457d-aa5e-df093d00ee43',
  //     ]),
  //   })),
  // });
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
