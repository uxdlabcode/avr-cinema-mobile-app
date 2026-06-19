import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getMatchingData, getSignedUrl } from "@/Firebase";
import type { MediaItem } from "./homeSlice";

interface TrailerState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: TrailerState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchTrailerMedia = createAsyncThunk("trailer/fetchTrailerMedia", async () => {
  // Fetch only Movie, TV Show, and Documentary items with a limit of 40
  const docs = await getMatchingData("media", "category", "in", ["Movie", "TV Show", "Documentary"], 40);

  const enriched = await Promise.all(
    docs.map(async (doc: any) => {
      let image = "/assets/poster.png";
      if (doc.thumbnailUrl) {
        try {
          image = await getSignedUrl(doc.thumbnailUrl);
        } catch {
          image = doc.thumbnailUrl;
        }
      }
      return {
        ...doc,
        id: doc.id,
        image,
        signedThumbnailUrl: image,
        category: doc.category || "Movie",
        releaseYear: doc.releaseYear || doc.year || 2026,
        ageRating: doc.ageRating || doc.rating || "U/A 13+",
        language: doc.language || "Hindi",
        duration: doc.duration || "N/A",
      };
    })
  );

  return enriched;
});

const trailerSlice = createSlice({
  name: "trailer",
  initialState,
  reducers: {
    resetTrailerStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrailerMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTrailerMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTrailerMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load trailer media";
      });
  },
});

export const { resetTrailerStatus } = trailerSlice.actions;
export default trailerSlice.reducer;
