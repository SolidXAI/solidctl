import { IUser } from "../backend/models/user";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { NextRequest } from "next/server";
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module "next/server" {
  interface NextRequest {
    user: IUser;
  }
}


declare module "@reduxjs/toolkit/query/react" {
  interface FetchBaseQueryError {
    data?: any;
  }
}



declare module 'next-auth' {
  interface Session {
    error:string | null,
    user: {
      accessToken: string;
      refreshToken: string;
      accessTokenExpires:number;
    } & DefaultSession['user'];
  }

  interface User {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires:number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    error:string;
    accessTokenExpires:number;
  }
}