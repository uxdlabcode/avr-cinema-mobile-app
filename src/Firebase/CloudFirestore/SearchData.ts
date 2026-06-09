import { collection, addDoc, getDocs, query, where, deleteDoc, doc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export interface RecentSearchDoc {
  id: string;
  query: string;
  uid: string;
  timestamp: number;
}

export const addRecentSearch = async (uid: string, searchQuery: string): Promise<RecentSearchDoc> => {
  const now = Timestamp.now();
  const data = {
    query: searchQuery,
    uid,
    timestamp: now,
    createdAt: now,
  };
  const docRef = await addDoc(collection(db, "searches"), data);
  return {
    id: docRef.id,
    query: searchQuery,
    uid,
    timestamp: now.toMillis()
  };
};

export const fetchRecentSearches = async (uid: string, limitCount: number = 7, lastTimestamp?: number): Promise<RecentSearchDoc[]> => {
  // Query only by uid to avoid requiring a composite index in Firestore
  const q = query(
    collection(db, "searches"),
    where("uid", "==", uid)
  );

  const snapshot = await getDocs(q);
  let results = snapshot.docs.map(doc => {
    const data = doc.data();
    let ts = Date.now();
    if (data.timestamp instanceof Timestamp) {
      ts = data.timestamp.toMillis();
    } else if (typeof data.timestamp === 'number') {
      ts = data.timestamp;
    } else if (data.timestamp && typeof data.timestamp.toDate === 'function') {
      ts = data.timestamp.toDate().getTime();
    }
    return {
      id: doc.id,
      query: data.query,
      uid: data.uid,
      timestamp: ts
    } as RecentSearchDoc;
  });

  // Sort by timestamp descending in-memory
  results.sort((a, b) => b.timestamp - a.timestamp);

  // Paginate in-memory if lastTimestamp is provided
  if (lastTimestamp) {
    results = results.filter(item => item.timestamp < lastTimestamp);
  }

  return results.slice(0, limitCount);
};

export const deleteRecentSearch = async (docId: string): Promise<void> => {
  await deleteDoc(doc(db, "searches", docId));
};

export const clearAllRecentSearches = async (uid: string): Promise<void> => {
  const q = query(collection(db, "searches"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.delete(doc(db, "searches", document.id));
  });
  
  await batch.commit();
};
