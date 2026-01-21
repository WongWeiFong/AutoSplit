import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { id: '000001', email: 'alice@example.com', name: 'Alice' },
      { id: '000002', email: 'bob@example.com', name: 'Bob' },
      { id: '000003', email: 'charlie@example.com', name: 'Charlie' },
    ],
    skipDuplicates: true, // in case you re-run
  });

  console.log('Users seeded ✅');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
