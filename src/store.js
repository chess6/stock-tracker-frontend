import { configureStore, createSlice } from '@reduxjs/toolkit';

const screenerSlice = createSlice({
  name: 'screener',
  initialState: {
    rows: [],
    loaded: false,
    error: null,
  },
  reducers: {
    setRows(state, action) {
      state.rows = action.payload;
      state.loaded = true;
      state.error = null;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loaded = false;
    },
    clearScreener(state) {
      state.rows = [];
      state.loaded = false;
      state.error = null;
    },
  },
});

export const { setRows, setError, clearScreener } = screenerSlice.actions;

const store = configureStore({
  reducer: {
    screener: screenerSlice.reducer,
  },
});

export default store;
