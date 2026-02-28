// ─────────────────────────────────────────────────────────────────────────────
// prisma/seed.ts — Development seed data
//
// Run:  pnpm --filter api db:seed
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient, Theme, ViewMode, LinkStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱  Seeding development database…');

  // ─── Users ────────────────────────────────────────────────────────────────
  const aliceHash = await bcrypt.hash('Password1!', BCRYPT_ROUNDS);
  const bobHash = await bcrypt.hash('Password1!', BCRYPT_ROUNDS);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      passwordHash: aliceHash,
      displayName: 'Alice',
      emailVerified: true,
      theme: Theme.DARK,
      defaultView: ViewMode.GRID,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      passwordHash: bobHash,
      displayName: 'Bob',
      emailVerified: true,
      theme: Theme.LIGHT,
      defaultView: ViewMode.LIST,
    },
  });

  // ─── Collections ──────────────────────────────────────────────────────────
  const devRoot = await prisma.collection.upsert({
    where: { id: 'seed-col-dev' },
    update: {},
    create: {
      id: 'seed-col-dev',
      name: 'Development',
      color: '#6366F1',
      icon: 'code-2',
      sortOrder: 0,
      userId: alice.id,
    },
  });

  const toolsChild = await prisma.collection.upsert({
    where: { id: 'seed-col-tools' },
    update: {},
    create: {
      id: 'seed-col-tools',
      name: 'Tools',
      color: '#8B5CF6',
      icon: 'wrench',
      parentId: devRoot.id,
      sortOrder: 0,
      userId: alice.id,
    },
  });

  const designRoot = await prisma.collection.upsert({
    where: { id: 'seed-col-design' },
    update: {},
    create: {
      id: 'seed-col-design',
      name: 'Design',
      color: '#EC4899',
      icon: 'palette',
      sortOrder: 1,
      userId: alice.id,
    },
  });

  // ─── Tags ─────────────────────────────────────────────────────────────────
  const tagTypescript = await prisma.tag.upsert({
    where: { userId_name: { userId: alice.id, name: 'typescript' } },
    update: {},
    create: { name: 'typescript', color: '#3B82F6', userId: alice.id },
  });

  const tagOss = await prisma.tag.upsert({
    where: { userId_name: { userId: alice.id, name: 'open-source' } },
    update: {},
    create: { name: 'open-source', color: '#22C55E', userId: alice.id },
  });

  const tagDesign = await prisma.tag.upsert({
    where: { userId_name: { userId: alice.id, name: 'design' } },
    update: {},
    create: { name: 'design', color: '#F472B6', userId: alice.id },
  });

  // ─── Bookmarks ────────────────────────────────────────────────────────────
  await prisma.bookmark.upsert({
    where: { id: 'seed-bm-prisma' },
    update: {},
    create: {
      id: 'seed-bm-prisma',
      url: 'https://www.prisma.io/docs',
      title: 'Prisma Documentation',
      description: 'Next-generation ORM for Node.js and TypeScript',
      linkStatus: LinkStatus.OK,
      userId: alice.id,
      collectionId: toolsChild.id,
      tags: {
        create: [
          { tag: { connect: { id: tagTypescript.id } } },
          { tag: { connect: { id: tagOss.id } } },
        ],
      },
    },
  });

  await prisma.bookmark.upsert({
    where: { id: 'seed-bm-tailwind' },
    update: {},
    create: {
      id: 'seed-bm-tailwind',
      url: 'https://tailwindcss.com',
      title: 'Tailwind CSS',
      description: 'A utility-first CSS framework',
      isPinned: true,
      linkStatus: LinkStatus.OK,
      userId: alice.id,
      collectionId: designRoot.id,
      tags: {
        create: [{ tag: { connect: { id: tagDesign.id } } }],
      },
    },
  });

  await prisma.bookmark.upsert({
    where: { id: 'seed-bm-vite' },
    update: {},
    create: {
      id: 'seed-bm-vite',
      url: 'https://vitejs.dev',
      title: 'Vite — Next Generation Frontend Tooling',
      description: 'Blazing fast HMR development server',
      linkStatus: LinkStatus.OK,
      userId: alice.id,
      collectionId: devRoot.id,
    },
  });

  // Bob gets a small seed too
  await prisma.collection.upsert({
    where: { id: 'seed-col-bob-reading' },
    update: {},
    create: {
      id: 'seed-col-bob-reading',
      name: 'Reading List',
      color: '#F59E0B',
      icon: 'book-open',
      sortOrder: 0,
      userId: bob.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('✅  Seed complete.');
  // eslint-disable-next-line no-console
  console.log(`   alice@example.com  /  Password1!`);
  // eslint-disable-next-line no-console
  console.log(`   bob@example.com    /  Password1!`);
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
