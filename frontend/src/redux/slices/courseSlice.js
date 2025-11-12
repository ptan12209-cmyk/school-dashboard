// courseSlice.js - Redux slice for course management
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import courseService from '../../services/courseService'; // Assuming a service exists

const initialState = {
  courses: [],
  loading: false,
  error: null,
};

// Example async thunk for fetching courses
export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (params, { rejectWithValue }) => {
    // TODO: Implement when courseService is ready
    // try {
    //   const response = await courseService.getCourses(params);
    //   return response.data;
    // } catch (error) {
    //   return rejectWithValue(error.response?.data?.message || 'Failed to fetch courses');
    // }
    return []; // Returning mock data for now
  }
);

const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default courseSlice.reducer;
