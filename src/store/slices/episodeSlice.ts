import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, query, where, limit, startAfter, getDocs } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { getSignedUrl } from "@/Firebase";
import type { MediaItem } from "./homeSlice";

interface EpisodeState {
  items: MediaItem[];
  status: "idle" | "loading" | "loadingMore" | "succeeded" | "failed";
  error: string | null;
  lastDocId: string | null;
  hasMore: boolean;
}

const initialState: EpisodeState = {
  items: [],
  status: "idle",
  error: null,
  lastDocId: null,
  hasMore: true,
};

const documentSnapshotCache = new Map<string, any>();

interface FetchEpisodeParams {
  limitVal?: number;
  loadMore?: boolean;
}

export const fetchEpisodeMedia = createAsyncThunk(
  "episode/fetchEpisodeMedia",
  async (params: FetchEpisodeParams | void, thunkAPI) => {
    const { limitVal = 20, loadMore = false } = params || {};
    const state = thunkAPI.getState() as any;
    const { lastDocId } = state.episode;

    let q;
    if (!loadMore || !lastDocId) {
      q = query(collection(db, "media"), where("category", "==", "TV Show"), limit(limitVal));
    } else {
      const lastDocSnapshot = documentSnapshotCache.get(lastDocId);
      if (lastDocSnapshot) {
        q = query(collection(db, "media"), where("category", "==", "TV Show"), startAfter(lastDocSnapshot), limit(limitVal));
      } else {
        q = query(collection(db, "media"), where("category", "==", "TV Show"), limit(limitVal));
      }
    }

    const querySnapshot = await getDocs(q);
    const fetchedItems: any[] = [];

    querySnapshot.forEach((doc) => {
      documentSnapshotCache.set(doc.id, doc);
      fetchedItems.push({ id: doc.id, ...doc.data() });
    });

    const enriched = await Promise.all(
      fetchedItems.map(async (doc: any) => {
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

    const docs = querySnapshot.docs;
    const newLastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;
    const hasMore = docs.length === limitVal;

    return {
      items: enriched,
      lastDocId: newLastDocId,
      hasMore,
      isLoadMore: loadMore && Boolean(lastDocId),
    };
  }
);

const episodeSlice = createSlice({
  name: "episode",
  initialState,
  reducers: {
    resetEpisodeStatus(state) {
      state.status = "idle";
      state.items = [];
      state.lastDocId = null;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEpisodeMedia.pending, (state, action) => {
        if (action.meta.arg?.loadMore) {
          state.status = "loadingMore";
        } else {
          state.status = "loading";
        }
      })
      .addCase(fetchEpisodeMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.isLoadMore) {
          state.items = [...state.items, ...action.payload.items];
        } else {
          state.items = action.payload.items;
        }
        state.lastDocId = action.payload.lastDocId;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchEpisodeMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load Episode media";
      });
  },
});

export const { resetEpisodeStatus } = episodeSlice.actions;
export default episodeSlice.reducer;
