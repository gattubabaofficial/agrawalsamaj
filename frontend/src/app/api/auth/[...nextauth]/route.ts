import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    {
      id: "yahoo",
      name: "Yahoo",
      type: "oauth",
      clientId: process.env.YAHOO_CLIENT_ID!,
      clientSecret: process.env.YAHOO_CLIENT_SECRET!,
      wellKnown: "https://api.login.yahoo.com/.well-known/openid-configuration",
      authorization: { params: { scope: "openid profile email" } },
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "yahoo") {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          // Send the verified profile details to your FastAPI backend
          const response = await axios.post(`${apiBaseUrl}/api/v1/auth/register/oauth`, {
            first_name: user.name?.split(" ")[0] || "User",
            surname: user.name?.split(" ").slice(1).join(" ") || "",
            email: user.email,
            provider: account.provider,
            provider_id: user.id,
          });
          
          // Store backend JWT token and role in user object for session retrieval
          (user as any).backendToken = response.data.access_token;
          (user as any).backendRole = response.data.role;
          return true;
        } catch (error) {
          console.error("Backend OAuth save failed:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as any).backendToken;
        token.backendRole = (user as any).backendRole;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.backendToken;
      (session as any).role = token.backendRole;
      return session;
    }
  }
});

export { handler as GET, handler as POST };
