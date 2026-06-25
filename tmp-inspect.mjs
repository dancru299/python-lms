import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const sections = await p.section.findMany({
  where: {
    id: "cmqqbsfr7000110600kcs1zme"
  },
  select: {
    id: true,
    title: true,
    contentBlocks: true
  }
});

console.log(JSON.stringify(sections, null, 2));

await p.$disconnect();
