import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          });

          if (!user) {
            console.warn('[AUTH] Aucun compte trouvé pour:', credentials.email);
            return null;
          }
          if (!user.isActive) {
            console.warn('[AUTH] Compte désactivé:', credentials.email);
            return null;
          }

          const isValid = await compare(credentials.password as string, user.passwordHash);
          if (!isValid) {
            console.warn('[AUTH] Mot de passe incorrect pour:', credentials.email);
            return null;
          }

          // Incrémenter le compteur de connexion (non bloquant)
          prisma.user.update({
            where: { id: user.id },
            data: { loginCount: { increment: 1 }, lastLoginAt: new Date() },
          }).catch(e => console.warn('[AUTH] loginCount update failed:', e.message));

          // Log de connexion (non bloquant)
          prisma.activityLog.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              userName: user.fullName,
              action: 'login',
              module: 'auth',
              details: `Connexion utilisateur: ${user.fullName}`,
            } as any,
          }).catch(e => console.warn('[AUTH] activityLog failed:', e.message));

          // Extract permission codes
          const permissions = user.role?.rolePermissions.map((rp: any) => rp.permission.code) || [];

          return {
            id: user.id,
            name: user.fullName,
            email: user.email,
            roleId: user.roleId,
            roleCode: user.role?.code || '',
            roleName: user.role?.name || '',
            avatar: user.avatar,
            poleIds: user.poleIds,
            permissions,
          };
        } catch (error: any) {
          console.error('[AUTH] authorize error:', error.message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleId = (user as any).roleId;
        token.roleCode = (user as any).roleCode;
        token.roleName = (user as any).roleName;
        token.avatar = (user as any).avatar;
        token.poleIds = (user as any).poleIds;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).roleId = token.roleId;
        (session.user as any).roleCode = token.roleCode;
        (session.user as any).roleName = token.roleName;
        (session.user as any).avatar = token.avatar;
        (session.user as any).poleIds = token.poleIds;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});
