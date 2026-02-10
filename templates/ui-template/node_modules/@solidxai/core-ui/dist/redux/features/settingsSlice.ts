import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export interface ISettingsState {
  authSettings: Record<string, any>;
  solidSettings: Record<string, any>;
}

const initialState: ISettingsState = {
  authSettings: {},
  solidSettings: {},
};

export const settingsSlice = createSlice({
  name: "settingsSlice",
  initialState,
  reducers: {
    // // -------- AUTH SETTINGS --------
    // setAuthSettings: (
    //   state,
    //   action: PayloadAction<Record<string, any>>
    // ) => {
    //   state.authSettings = action.payload;
    // },

    // updateAuthSetting: (
    //   state,
    //   action: PayloadAction<{ key: string; value: any }>
    // ) => {
    //   state.authSettings[action.payload.key] = action.payload.value;
    // },

    // -------- SOLID SETTINGS --------
    setSolidSettings: (
      state,
      action: PayloadAction<Record<string, any>>
    ) => {
      state.solidSettings = action.payload;
    },

    updateSolidSetting: (
      state,
      action: PayloadAction<{ key: string; value: any }>
    ) => {
      state.solidSettings[action.payload.key] = action.payload.value;
    },

    // -------- RESET --------
    resetSettings: () => initialState,
  },
});

export default settingsSlice.reducer;

export const {
  // setAuthSettings,
  // updateAuthSetting,
  setSolidSettings,
  updateSolidSetting,
  resetSettings,
} = settingsSlice.actions;
