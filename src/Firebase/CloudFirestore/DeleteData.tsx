import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { getMatchingData } from "./GetData";
import { deleteImage } from "../CloudStorage/UploadImages";
import { updateDocument } from "./UpdateData";


// Types
interface DocumentData {
  id: string;
  imgUrl?: string;
  [key: string]: any;
}

type WhereFilterOp = 
  | '<' 
  | '<=' 
  | '==' 
  | '!=' 
  | '>=' 
  | '>' 
  | 'array-contains' 
  | 'in' 
  | 'array-contains-any' 
  | 'not-in';

// Delete a Document from a Collection
export const deleteDocument = async (collectionName: string, documentName: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, collectionName, documentName));
  } catch (err) {
    console.error('Error deleting document:', err);
    throw err;
  }
};

export const deleteDocumentWithChild = async (
  collection: string,
  parentId: string,
  childCollection: string,
  childKey: string
): Promise<void> => {
  try {
    const res: DocumentData[] = await getMatchingData(
      childCollection,
      childKey,
      "array-contains",
      parentId
    );
    
    await deleteDocument(collection, parentId);
    
    const deletePromises = res.map(async (docData: DocumentData) => {
      await deleteDocument(childCollection, docData.id);
      if (docData.imgUrl) {
        await deleteImage(docData.imgUrl);
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted parent document ${parentId} and ${res.length} child documents`);
  } catch (err) {
    console.error('Error deleting document with children:', err);
    throw err;
  }
};

export const deleteDocumentWithChildKey = async (
  collection: string,
  parentId: string,
  childCollection: string,
  childKey: string,
  operator: WhereFilterOp
): Promise<void> => {
  try {
    const res: DocumentData[] = await getMatchingData(
      childCollection,
      childKey,
      operator,
      parentId
    );
    
    await deleteDocument(collection, parentId);
    
    const deletePromises = res.map(async (docData: DocumentData) => {
      await deleteDocument(childCollection, docData.id);
      if (docData.imgUrl) {
        await deleteImage(docData.imgUrl);
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted parent document ${parentId} and ${res.length} child documents`);
  } catch (err) {
    console.error('Error deleting document with child key:', err);
    throw err;
  }
};

export const updateAll = async (): Promise<void> => {
  // Early return as commented in original code

  
  try {
    const res: DocumentData[] = await getMatchingData("users", "role", "==", "children");
    console.log(res);
    
    const updatePromises = res.map(async (user: DocumentData) => {
      await updateDocument("users", user.id, {
        tenant_id: "436563553377628200000",
        center_name: "Global Education Development"
      });
    });
    
    await Promise.all(updatePromises);
    console.log(`Updated ${res.length} user documents`);
  } catch (err) {
    console.error('Error updating all documents:', err);
    throw err;
  }
};