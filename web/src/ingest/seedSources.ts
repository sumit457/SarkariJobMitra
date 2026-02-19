import { prisma } from "@/src/lib/prisma";

import { DEFAULT_SOURCES } from "./sources";

async function main() {
  for (const source of DEFAULT_SOURCES) {
    await prisma.source.upsert({
      where: { key: source.key },
      update: {
        name: source.name,
        listingUrl: source.listingUrl,
        type: source.type,
        isActive: true,
      },
      create: {
        key: source.key,
        name: source.name,
        listingUrl: source.listingUrl,
        type: source.type,
        isActive: true,
      },
    });
  }

  console.log("Seeded sources:", DEFAULT_SOURCES.map((s) => s.key));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
