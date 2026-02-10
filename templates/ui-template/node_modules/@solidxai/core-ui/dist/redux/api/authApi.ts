
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    initateLogin: builder.mutation({
      query(body) {
        return {
          url: "/iam/otp/login/initiate",
          method: "POST",
          body,
        };
      },
    }),
    confirmOtpLogin: builder.mutation({
      query(body) {
        return {
          url: "/iam/otp/login/confirm",
          method: "POST",
          body,
        };
      },
    }),
    register: builder.mutation({
      query(body) {
        return {
          url: "/iam/register",
          method: "POST",
          body,
        };
      },
    }),
    initateRegister: builder.mutation({
      query(body) {
        return {
          url: "/iam/otp/register/initiate",
          method: "POST",
          body,
        };
      },
    }),
    confirmOtpRegister: builder.mutation({
      query(body) {
        return {
          url: "/iam/otp/register/confirm",
          method: "POST",
          body,
        };
      },
    }),
    registerPrivate: builder.mutation({
      query(body) {
        return {
          url: "/iam/register-private",
          method: "POST",
          body,
        };
      },
    }),
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `/user/${id}/update-user-and-roles`,
        method: 'PATCH',
        body: data,
      }),
    }),
    forgotPassword: builder.mutation({
      query(body) {
        return {
          url: "/password/forgot",
          method: "POST",
          body,
        };
      },
    }),
    resetPassword: builder.mutation({
      query({ token, body }) {
        return {
          url: `/password/reset/${token}`,
          method: "PUT",
          body,
        };
      },
    }),
    initiateChangePassword: builder.mutation({
      query(body) {
        return {
          url: '/iam/initiate/forgot-password',
          method: "POST",
          body,
        }
      }
    }),
    confirmForgotPassword: builder.mutation({
      query(body) {
        return {
          url: '/iam/confirm/forgot-password',
          method: "POST",
          body
        }
      }
    }),
    changePassword: builder.mutation({
      query(body) {
        return {
          url: `/iam/change-password`,
          method: "POST",
          body,
        };
      },
    }),
  }),
});

export const {
  useRegisterMutation,
  useRegisterPrivateMutation,
  useUpdateUserMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useInitiateChangePasswordMutation,
  useConfirmForgotPasswordMutation,
  useChangePasswordMutation,
  useInitateLoginMutation,
  useConfirmOtpLoginMutation,
  useInitateRegisterMutation,
  useConfirmOtpRegisterMutation,
} = authApi;