const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration...');

  try {
    // Example: Add missing tags to existing incidents if necessary
    const incidents = await prisma.incident.findMany({ where: { tags: { isEmpty: true } } });
    for (const incident of incidents) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: { tags: ['System'] }, // Default tag for old incidents
      });
    }
    console.log(`Migrated ${incidents.length} incidents.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
