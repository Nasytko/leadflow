import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      locale: string;
      isAdmin: boolean;
    };
  }

  interface User {
    locale?: string;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    locale?: string;
    isAdmin?: boolean;
  }
}
