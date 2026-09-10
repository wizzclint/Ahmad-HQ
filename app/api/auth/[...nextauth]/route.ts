import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { checkUserAccess } from "@/lib/hq-data";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;
            const hqUser = await checkUserAccess(user.email);
            return hqUser.authorized; // true allows sign in, false rejects
        },
        async jwt({ token, user }) {
            // First time jwt is called after sign in, user is defined
            if (user?.email) {
                const hqUser = await checkUserAccess(user.email);
                if (hqUser.authorized) {
                    token.role = hqUser.role;
                    token.area = hqUser.area;
                    token.canSeeAll = hqUser.canSeeAll;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.area = token.area as string;
                session.user.canSeeAll = token.canSeeAll as boolean;
            }
            return session;
        },
    },
    pages: {
        // We can use NextAuth's default pages for now, or specify a custom one.
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
