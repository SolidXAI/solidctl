import NextAuth from "next-auth";
import { authProviders } from "@solidstarters/solid-core-ui";

const auth = NextAuth(authProviders);

export { auth as GET, auth as POST };