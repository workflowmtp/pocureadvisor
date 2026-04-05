import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, DEFAULT_ROLES } from './permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding permissions and roles...');

  // ─── Create Permissions ───
  console.log('Creating permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        category: perm.category,
        isSystem: perm.isSystem,
      },
      create: {
        code: perm.code,
        name: perm.name,
        category: perm.category,
        isSystem: perm.isSystem,
      },
    });
  }
  console.log(`✅ Created ${PERMISSIONS.length} permissions`);

  // ─── Create Roles ───
  console.log('Creating roles...');
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map(p => [p.code, p.id]));

  for (const role of DEFAULT_ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isDefault: role.isDefault,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isDefault: role.isDefault,
      },
    });

    // Assign permissions
    if (role.permissions === '*') {
      // Admin gets all permissions
      for (const perm of allPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: createdRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: createdRole.id, permissionId: perm.id },
        });
      }
    } else {
      // Specific permissions
      for (const permCode of role.permissions) {
        const permId = permMap.get(permCode);
        if (permId) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: createdRole.id, permissionId: permId } },
            update: {},
            create: { roleId: createdRole.id, permissionId: permId },
          });
        }
      }
    }
  }
  console.log(`✅ Created ${DEFAULT_ROLES.length} roles`);

  // ─── Update existing users without role ───
  const defaultRole = await prisma.role.findFirst({ where: { isDefault: true } });
  if (defaultRole) {
    const usersWithoutRole = await prisma.user.findMany({
      where: { roleId: { equals: undefined as any } },
    });
    
    for (const user of usersWithoutRole) {
      // Try to find matching role by old role field
      const roleMapping: Record<string, string> = {
        'admin': 'admin',
        'dir_achat': 'dir_achat',
        'acheteur': 'acheteur',
        'comptable': 'comptable',
        'magasin': 'magasin',
        'audit': 'audit',
        'dg': 'dg',
        'consult': 'consult',
      };
      
      const roleCode = roleMapping[(user as any).role] || 'acheteur';
      const matchingRole = await prisma.role.findUnique({ where: { code: roleCode } });
      
      if (matchingRole) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: matchingRole.id },
        });
        console.log(`✅ Updated user ${user.email} with role ${matchingRole.name}`);
      }
    }
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
