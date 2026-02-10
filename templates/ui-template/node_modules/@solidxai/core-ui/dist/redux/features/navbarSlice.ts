import { createSlice } from '@reduxjs/toolkit';
const navbarSlice = createSlice({
    name: 'navbar',
    initialState: {
        visibleNavbar: false,
    },
    reducers: {
        showNavbar: (state) => {
            state.visibleNavbar = true
        },
        hideNavbar: (state) => {
            state.visibleNavbar = false
        },
        toggleNavbar(state) {
            state.visibleNavbar = state.visibleNavbar === true ? false : true;
        },
    }
})

export const { showNavbar, hideNavbar, toggleNavbar } = navbarSlice.actions;
export default navbarSlice.reducer