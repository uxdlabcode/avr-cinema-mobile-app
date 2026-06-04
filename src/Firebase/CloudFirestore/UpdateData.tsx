import { arrayUnion, arrayRemove, doc, increment, updateDoc, type DocumentData } from "firebase/firestore";
import { db } from "../firebase";


// Update a document in a Collection
export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<void> {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
    });
  } catch (err) {
    console.error("Error updating document:", err);
    throw err;
  }
}

// Update arrays of a Collection
export async function updateArray(
  collectionName: string,
  docId: string,
  key: string,
  data: unknown
): Promise<void> {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      [key]: arrayUnion(data),
    });
  } catch (err) {
    console.error("Error updating array:", err);
    throw err;
  }
}

export const incrementDecrement = async (
  collectionName: string, 
  docId: string, 
  key: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      [key]: increment(1),
    });
  } catch (err) {
    console.error("Error incrementing value:", err);
    throw err;
  }
};

export async function pushValueToArrayInDoc<T>(
  collectionName: string,
  docId: string,
  fieldName: string,
  valueToPush: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      [fieldName]: arrayUnion(valueToPush),
    });
  } catch (err) {
    console.error("Error pushing value to array:", err);
    throw err;
  }
}

export async function removeValueFromArrayInDoc<T>(
  collectionName: string,
  docId: string,
  fieldName: string,
  valueToRemove: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      [fieldName]: arrayRemove(valueToRemove),
    });
  } catch (err) {
    console.error("Error removing value from array:", err);
    throw err;
  }
}

export const incrementNumber = async (
  collectionName: string,
  documentId: string, 
  key: string, 
  value: number
): Promise<void> => {
  try {
    await updateDoc(doc(db, collectionName, documentId), {
      [key]: increment(value),
    });
  } catch (err) {
    console.error("Error incrementing number:", err);
    throw err;
  }
};

export const decrementNumber = async (
  collectionName: string,
  documentId: string, 
  key: string, 
  value: number
): Promise<void> => {
  try {
    await updateDoc(doc(db, collectionName, documentId), {
      [key]: increment(-value),
    });
  } catch (err) {
    console.error("Error decrementing number:", err);
    throw err;
  }
};