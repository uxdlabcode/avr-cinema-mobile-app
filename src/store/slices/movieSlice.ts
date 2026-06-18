import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData, getSignedUrl } from "@/Firebase";
import type { MediaItem } from "./homeSlice";

interface MovieState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: MovieState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchMovieMedia = createAsyncThunk(
  "movie/fetchMovieMedia",
  async () => {
    const docs = await getCollectionData("media");

    const movieDocs = (docs || []).filter(
      (doc: any) => doc.category === "Movie"
    );

    const enriched = await Promise.all(
      movieDocs.map(async (doc: any) => {
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
          category: "Movie",
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
  }
);

const movieSlice = createSlice({
  name: "movie",
  initialState,
  reducers: {
    resetMovieStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMovieMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMovieMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchMovieMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load movie media";
      });
  },
});

export const { resetMovieStatus } = movieSlice.actions;
export default movieSlice.reducer;
