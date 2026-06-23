import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { compoundQuery, getDocumentData, getSignedUrl } from "@/Firebase";

interface WatchItem {
  id: string;
  movieId: string;
  title: string;
  image: string;
  currentTime: number;
  duration: number;
  updatedAt?: number;
}

interface WatchProgressState {
  items: WatchItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: WatchProgressState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchWatchProgress = createAsyncThunk(
  "watchProgress/fetchWatchProgress",
  async (userId: string) => {
    // 1. Get all watch_progress docs for this user
    const docs = await compoundQuery("watch_progress", [
      { key: "userId", operator: "==", value: userId },
    ]);

    if (!docs || docs.length === 0) {
      return [];
    }

    // 2. Sort by updatedAt (latest first) and take top 10
    const sorted = [...docs]
      .filter((d) => d.currentTime > 0 && d.duration > 0)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10);

    // 3. For each item, fetch the media document to get title + thumbnail
    const enrichedResults = await Promise.all(
      sorted.map(async (doc): Promise<WatchItem | null> => {
        try {
          const media = await getDocumentData("media", doc.movieId);
          if (!media) return null;
          let image = "/assets/episode1.webp";
          if (media.thumbnailUrl) {
            try {
              image = await getSignedUrl(media.thumbnailUrl);
            } catch {
              image = media.thumbnailUrl;
            }
          }
          return {
            id: doc.id,
            movieId: doc.movieId,
            title: media.title || "Unknown",
            image,
            currentTime: doc.currentTime,
            duration: doc.duration,
            updatedAt: doc.updatedAt,
          };
        } catch {
          return null;
        }
      })
    );

    const enriched = enrichedResults.filter(
      (item): item is WatchItem => item !== null && item.title !== "Unknown"
    );

    return enriched;
  }
);

const watchProgressSlice = createSlice({
  name: "watchProgress",
  initialState,
  reducers: {
    resetWatchProgress(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
    },
    updateLocalWatchProgress(state, action) {
      const { movieId, currentTime } = action.payload;
      const item = state.items.find((i) => i.movieId === movieId);
      if (item) {
        item.currentTime = currentTime;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchProgress.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchWatchProgress.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchWatchProgress.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load watch progress";
      });
  },
});

export const { resetWatchProgress, updateLocalWatchProgress } = watchProgressSlice.actions;
export default watchProgressSlice.reducer;
