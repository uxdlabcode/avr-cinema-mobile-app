import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getMatchingData, getSignedUrl } from "@/Firebase";
import type { MediaItem } from "./homeSlice";

interface DocumentaryState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: DocumentaryState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchDocumentaryMedia = createAsyncThunk("documentary/fetchDocumentaryMedia", async () => {
  // Fetch only Documentary category items with a limit of 40
  const docs = await getMatchingData("media", "category", "==", "Documentary", 40);

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
        category: doc.category || "Documentary",
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

const documentarySlice = createSlice({
  name: "documentary",
  initialState,
  reducers: {
    resetDocumentaryStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentaryMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDocumentaryMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchDocumentaryMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load Documentary media";
      });
  },
});

export const { resetDocumentaryStatus } = documentarySlice.actions;
export default documentarySlice.reducer;
