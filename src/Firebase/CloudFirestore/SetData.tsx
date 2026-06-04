
import { addDoc, collection, doc, setDoc, type DocumentData, type DocumentReference, type CollectionReference } from "firebase/firestore";
import { db } from "../firebase";


// Add Document to a Collection
export const addDocument = async <T extends DocumentData>(
  collectionName: string, 
  data: T
): Promise<DocumentReference<T> | void> => {
  try {
    return await addDoc(collection(db, collectionName) as CollectionReference<T>, {
      ...data,
    });
  } catch (err) {
    console.error("Error adding document:", err);
    throw err;
  }
};

// Create a Document with DocId
export const createDocument = async <T extends DocumentData>(
  collectionName: string, 
  docId: string, 
  data: T
): Promise<void> => {
  try {
    await setDoc(doc(db, collectionName, docId), {
      ...data,
    });
    console.log(`Document created successfully with ID: ${docId}`);
  } catch (err) {
    console.error("Error creating document:", err);
    throw err;
  }
};