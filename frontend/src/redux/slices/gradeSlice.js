// gradeSlice.js - Redux slice for grade management
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import gradeService from '../../services/gradeService'; // Assuming a service exists

const initialState = {
  grades: [],
  loading: false,
  error: null,
};

// Example async thunk for fetching grades
export const fetchGrades = createAsyncThunk(
  'grades/fetchGrades',
  async (params, { rejectWithValue }) => {
    // TODO: Implement when gradeService is ready
    // try {
    //   const response = await gradeService.getGrades(params);
    //   return response.data;
    // } catch (error) {
    //   return rejectWithValue(error.response?.data?.message || 'Failed to fetch grades');
    // }
    return []; // Returning mock data for now
  }
);

const gradeSlice = createSlice({
  name: 'grades',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGrades.fulfilled, (state, action) => {
        state.loading = false;
        state.grades = action.payload;
      })
      .addCase(fetchGrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default gradeSlice.reducer;
