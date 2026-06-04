import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { 
  addRecentSearch, 
  fetchRecentSearches, 
  deleteRecentSearch, 
  clearAllRecentSearches,
  type RecentSearchDoc 
} from '@/Firebase/CloudFirestore/SearchData';

interface SearchState {
  history: RecentSearchDoc[];
  loading: boolean;
  hasMore: boolean;
}

const initialState: SearchState = {
  history: [],
  loading: false,
  hasMore: true,
};

export const fetchInitialHistory = createAsyncThunk(
  'search/fetchInitial',
  async (uid: string) => {
    const data = await fetchRecentSearches(uid, 7);
    return data;
  }
);

export const fetchMoreHistory = createAsyncThunk(
  'search/fetchMore',
  async ({ uid, lastTimestamp }: { uid: string; lastTimestamp: number }) => {
    const data = await fetchRecentSearches(uid, 20, lastTimestamp);
    return data;
  }
);

export const saveSearch = createAsyncThunk(
  'search/save',
  async ({ uid, query }: { uid: string; query: string }, { getState }) => {
    const newDoc = await addRecentSearch(uid, query);
    return newDoc;
  }
);

export const deleteSearch = createAsyncThunk(
  'search/delete',
  async (docId: string) => {
    await deleteRecentSearch(docId);
    return docId;
  }
);

export const clearHistory = createAsyncThunk(
  'search/clear',
  async (uid: string) => {
    await clearAllRecentSearches(uid);
    return true;
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Initial fetch
    builder.addCase(fetchInitialHistory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchInitialHistory.fulfilled, (state, action: PayloadAction<RecentSearchDoc[]>) => {
      state.history = action.payload;
      state.loading = false;
      state.hasMore = action.payload.length === 7;
    });
    builder.addCase(fetchInitialHistory.rejected, (state) => {
      state.loading = false;
    });

    // Fetch more
    builder.addCase(fetchMoreHistory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMoreHistory.fulfilled, (state, action: PayloadAction<RecentSearchDoc[]>) => {
      // Remove duplicates if any
      const existingIds = new Set(state.history.map(item => item.id));
      const newItems = action.payload.filter(item => !existingIds.has(item.id));
      state.history = [...state.history, ...newItems];
      state.loading = false;
      state.hasMore = action.payload.length === 20;
    });
    builder.addCase(fetchMoreHistory.rejected, (state) => {
      state.loading = false;
    });

    // Save search
    builder.addCase(saveSearch.fulfilled, (state, action: PayloadAction<RecentSearchDoc>) => {
      // Remove older duplicate by query if it exists
      state.history = state.history.filter(
        item => item.query.toLowerCase() !== action.payload.query.toLowerCase()
      );
      // Add to front
      state.history.unshift(action.payload);
    });

    // Delete search
    builder.addCase(deleteSearch.fulfilled, (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(item => item.id !== action.payload);
    });

    // Clear history
    builder.addCase(clearHistory.fulfilled, (state) => {
      state.history = [];
      state.hasMore = false;
    });
  },
});

export default searchSlice.reducer;
