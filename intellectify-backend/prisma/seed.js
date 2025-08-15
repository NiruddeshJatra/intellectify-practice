const { PrismaClient, Role, OAuthProvider } = require('@prisma/client');
const prisma = new PrismaClient();

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seed script cannot be run in production environment');
  process.exit(1);
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.user.deleteMany({});
  console.log('🧹 Cleared existing users');

  // Create test users
  const testUsers = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: 'google-12345',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
      email: 'mentor@example.com',
      name: 'Mentor User',
      role: Role.MENTOR,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: 'google-67890',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    {
      email: 'user@example.com',
      name: 'Regular User',
      role: Role.REGULAR,
      provider: OAuthProvider.GITHUB,
      providerAccountId: 'github-54321',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.create({
      data: userData,
    });
    console.log(`✅ Created user: ${user.email} (${user.role})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed!');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  });
