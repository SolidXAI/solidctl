import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'authentication',
    initialState: {
        token: null, // Store the JWT token here
    },
    reducers: {
        setToken: (state, action) => {
            state.token = action.payload;
        },
        logout: (state) => {
            state.token = null;
        },
    },
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;