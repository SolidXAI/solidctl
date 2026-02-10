// store/features/dataViewSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DataViewState {
  dataView: 'LIST' | 'GRID';
}

const initialState: DataViewState = {
  dataView: 'LIST',
};

const dataViewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    gridView: (state) => {
      state.dataView = 'GRID';
    },
    listView: (state) => {
      state.dataView = 'LIST';
    },
  },
});

export const { gridView, listView } = dataViewSlice.actions;
export default dataViewSlice.reducer;
