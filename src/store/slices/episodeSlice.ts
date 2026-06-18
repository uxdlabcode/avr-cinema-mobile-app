import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData, getSignedUrl } from "@/Firebase";
import type { MediaItem } from "./homeSlice";

interface EpisodeState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: EpisodeState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchEpisodeMedia = createAsyncThunk("episode/fetchEpisodeMedia", async () => {
  const docs = await getCollectionData("media");

  const tvShows = (docs || []).filter(
    (doc: any) => doc.category === "TV Show"
  );

  const enriched = await Promise.all(
    tvShows.map(async (doc: any) => {
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

const episodeSlice = createSlice({
  name: "episode",
  initialState,
  reducers: {
    resetEpisodeStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEpisodeMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchEpisodeMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchEpisodeMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load Episode media";
      });
  },
});

export const { resetEpisodeStatus } = episodeSlice.actions;
export default episodeSlice.reducer;
