import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";

const resourceName = 'user';

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getusers: builder.query({
      query: (qs) => {
        return `/${resourceName}?${qs}`
      },
      // query: () => '/${resourceName}?offset=0&limit=5',
    }),
    getusersById: builder.query({
      query: (id) => `/${resourceName}/${id}?populate[0]=roles`,
    }),
    checkIfPermissionExists: builder.query({
      query: (query) => `/${resourceName}/permissions-exists?${query}`,
    }),
    
    registerUser: builder.mutation({
      query: (user) => ({
        url: `/${resourceName}/roles`,
        method: 'POST',
        body: user
      }),
    }),
    createuserrole: builder.mutation({
      query: (role) => ({
        url: `/${resourceName}/roles`,
        method: 'POST',
        body: role
      }),
    }),
    createuserrolebulk: builder.mutation({
      query: (role) => ({
        url: `/${resourceName}/roles/bulk`,
        method: 'POST',
        body: role
      }),
    }),
    updateProfile: builder.mutation({
      query(body) {
        return {
          url: `/me/update`,
          method: "PUT",
          body,
        };
      },
    }),
    updateSession: builder.query({
      query() {
        return {
          url: `/auth/session?update`,
        };
      },
    }),
    updatePassword: builder.mutation({
      query(body) {
        return {
          url: `/me/update_password`,
          method: "PUT",
          body,
        };
      },
    }),
    uploadAvatar: builder.mutation({
      query(body) {
        return {
          url: `/me/upload_avatar`,
          method: "PUT",
          body,
        };
      },
    }),
    updateUser: builder.mutation({
      query({ id, body }) {
        return {
          url: `/admin/${resourceName}/${id}`,
          method: "PUT",
          body,
        };
      },
    }),
    deleteMultipleUsers: builder.mutation({
      query: (data) => ({
        url: `/${resourceName}/bulk/`,
        method: 'DELETE',
        body: data
      }),
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/${resourceName}/${id}`,
        method: 'DELETE',
      }),
    }),

    getUser: builder.query({
      query: (userId) => `/user/${userId}?populateMedia[]=profilePicture&populate[]=roles`,
    }),

    updateUserProfile: builder.mutation({
      query: ({ data }) => ({
        url: `/user/profile`,
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useUpdateProfileMutation,
  useLazyUpdateSessionQuery,
  useLazyCheckIfPermissionExistsQuery,
  useUpdatePasswordMutation,
  useUploadAvatarMutation,
  // useUpdateUserMutation,
  useDeleteUserMutation,
  useGetusersQuery,
  useLazyGetusersQuery,
  useGetusersByIdQuery,
  useCreateuserroleMutation,
  useCreateuserrolebulkMutation,
  useDeleteMultipleUsersMutation,
  useLazyGetusersByIdQuery,
  useRegisterUserMutation,
  useUpdateSessionQuery,
  useGetUserQuery,
  useLazyGetUserQuery,
  useUpdateUserProfileMutation
} = userApi;
