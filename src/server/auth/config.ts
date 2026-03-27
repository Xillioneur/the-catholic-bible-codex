import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { db } from "~/server/db";
import { env } from "~/env";

/**
 * Module augmentation for `next-auth` types.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      lastReadOrder: number;
      lastReadTranslation: string;
    } & DefaultSession["user"];
  }
}

/**
 * Options for NextAuth.js.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID ?? env.GOOGLE_CLIENT_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET ?? env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  adapter: PrismaAdapter(db),
  trustHost: true,
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;
