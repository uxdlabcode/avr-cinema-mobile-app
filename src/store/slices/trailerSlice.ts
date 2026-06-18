import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData, getSignedUrl } from "@/Firebase";
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
  const docs = await getCollectionData("media");

  const filteredDocs = (docs || []).filter(
    (item: any) =>
      item.category === "Movie" ||
      item.category === "TV Show" ||
      item.category === "Documentary"
  );

  const enriched = await Promise.all(
    filteredDocs.map(async (doc: any) => {
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
