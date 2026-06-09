import { collection, addDoc, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc, getDocs as getDocsAll, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export interface RecentSearchDoc {
  id: string;
  query: string;
  uid: string;
  timestamp: number;
}

export const addRecentSearch = async (uid: string, searchQuery: string): Promise<RecentSearchDoc> => {
  const data = {
    query: searchQuery,
    uid,
    timestamp: Date.now(),
  };
  const docRef = await addDoc(collection(db, "searches"), data);
  return { id: docRef.id, ...data };
};

export const fetchRecentSearches = async (uid: string, limitCount: number = 7, lastTimestamp?: number): Promise<RecentSearchDoc[]> => {
  let q = query(
    collection(db, "searches"),
    where("uid", "==", uid),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );

  if (lastTimestamp) {
    // startAfter expects the actual values of the orderBy fields
    q = query(
      collection(db, "searches"),
      where("uid", "==", uid),
      orderBy("timestamp", "desc"),
      startAfter(lastTimestamp),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecentSearchDoc));
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
