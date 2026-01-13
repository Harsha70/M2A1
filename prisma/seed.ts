import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db"
})
const prisma = new PrismaClient({adapter});


async function main() {
  await prisma.user.createMany({
    data: [
      { email: 'free@gmail.com', name: 'Free', apiKey: 'free_key_123', tier: 'free' },
      // { email: 'abc@gmail.com', name: 'ABC', apiKey: '123' },
      // { email: 'def@gmail.com', name: 'DEF', apiKey: '234' },
      // { email: 'ghi@gmail.com', name: 'GHI', apiKey: '345' },
      // { email: 'hobby@gmail.com', name: 'Hobby', apiKey: 'hobby_key_123', tier: 'hobby' },
      // { email: 'enterprise@gmail.com', name: 'Enterprise', apiKey: 'enterprise_key_456', tier: 'enterprise' },
    ]
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




  