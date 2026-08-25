import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const emailLower = credentials.email.toLowerCase();

        // En développement, si l'admin hardcodé se connecte :
        if (emailLower === 'admin@autop.tn' && credentials.password === 'admin123') {
          return { id: 'admin-id', email: 'admin@autop.tn', name: 'Saif Admin', role: 'ADMIN' };
        }
        if (emailLower === 'admin@autop.fr' && credentials.password === 'admin123') {
          return { id: 'admin-id-fr', email: 'admin@autop.fr', name: 'Saif Admin FR', role: 'ADMIN' };
        }

        const user = await prisma.user.findUnique({
          where: { email: emailLower }
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        const displayName = user.name?.trim() || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

        return {
          id: user.id,
          email: user.email,
          name: displayName,
          role: user.role,
          phone: user.phone
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'secret-temporaire-autop-2026',
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/connexion',
  }
};