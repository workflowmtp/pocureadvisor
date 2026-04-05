import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping emails to role codes based on original data
const USER_ROLES: Record<string, string> = {
  'admin@multiprint.cm': 'admin',
  'dg@multiprint.cm': 'dg',
  'consultant@ext.cm': 'consult',
};

async function main() {
  console.log('🔧 Fixing user roles...');
  
  for (const [email, roleCode] of Object.entries(USER_ROLES)) {
    const user = await prisma.user.findUnique({ where: { email } });
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    
    if (user && role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: role.id },
      });
      console.log(`✅ Updated ${email} to role: ${role.name}`);
    }
  }
  
  // List all users with their roles
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { email: 'asc' },
  });
  
  console.log('\n📋 Current user roles:');
  users.forEach(u => {
    console.log(`  ${u.email}: ${u.role?.name || 'No role'}`);
  });
  
  console.log('\n✨ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
