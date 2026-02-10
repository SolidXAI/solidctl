// store/popupSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReactNode } from 'react';

interface PopupEvent {
  action: string;
  closable?: boolean;
  [key: string]: any;
}

export interface PopupState {
  isOpen: boolean;
  event: PopupEvent | null;
}

const initialState: PopupState = {
  isOpen: false,
  event: null,
};

const popupSlice = createSlice({
  name: 'popup',
  initialState,
  reducers: {
    openPopup: (state, action: PayloadAction<PopupEvent>) => {
      state.isOpen = true;
      state.event = action.payload;
    },
    closePopup: (state) => {
      state.isOpen = false;
      state.event = null;
    },
  },
});

export const { openPopup, closePopup } = popupSlice.actions;
export default popupSlice.reducer;
