import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData, getSignedUrl } from "@/Firebase";
import type { MediaItem } from "./homeSlice";

interface TvState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: TvState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchTvMedia = createAsyncThunk("tv/fetchTvMedia", async () => {
  const docs = await getCollectionData("media");

  const tvDocs = (docs || []).filter(
    (doc: any) => doc.category === "TV Show" || doc.category === "Documentary"
  );

  const enriched = await Promise.all(
    tvDocs.map(async (doc: any) => {
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
        category: doc.category || "TV Show",
        releaseYear: doc.releaseYear || doc.year || 2026,
        ageRating: doc.ageRating || doc.rating || "U/A 13+",
        language: doc.language || "Hindi",
        duration: doc.duration || "N/A",
      };
    })
  );

  return enriched.sort((a: any, b: any) => {
    const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
    const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
});

const tvSlice = createSlice({
  name: "tv",
  initialState,
  reducers: {
    resetTvStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTvMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTvMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTvMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load TV media";
      });
  },
});

export const { resetTvStatus } = tvSlice.actions;
export default tvSlice.reducer;
