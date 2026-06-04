import { collection, doc, getCountFromServer, getDoc, getDocs, limit, onSnapshot, orderBy, query, QueryConstraint, where, type DocumentData, type OrderByDirection, type QuerySnapshot, type WhereFilterOp } from "firebase/firestore";
import { db } from "../firebase";


// Types
interface Document {
  id: string;
  [key: string]: any;
}

interface QueryCondition {
  key: string;
  operator: WhereFilterOp;
  value: any;
}

// Get all the data from a collection
export const getCollectionData = async (collectionName: string): Promise<Document[]> => {
  const arr: Document[] = [];
  let querySnapshot: QuerySnapshot<DocumentData>;

  if (collectionName === "jobs") {
    const dataQuery = query(
      collection(db, collectionName),
      orderBy("submitDate", "desc")
    );
    querySnapshot = await getDocs(dataQuery);
  } else {
    querySnapshot = await getDocs(collection(db, collectionName));
  }

  querySnapshot.forEach((doc) => {
    arr.push({ id: doc.id, ...doc.data() });
  });

  return arr;
};

// Get all the data from a document
export const getDocumentData = async (
  collectionName: string, 
  documentName: string
): Promise<Document | undefined> => {
  const docRef = doc(db, collectionName, documentName);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { ...docSnap.data(), id: documentName };
  } else {
    console.log("No such document!");
    return undefined;
  }
};

// Get Number of Documents in Collection
export const numOfDocuments = async (collectionName: string): Promise<number> => {
  const data = await getCollectionData(collectionName);
  return data.length;
};

// Get Data using a Query
export const getMatchingData = async (
  collectionName: string,
  key: string,
  operator: WhereFilterOp,
  value: any
): Promise<Document[]> => {
  const arr: Document[] = [];

  const dataQuery = query(
    collection(db, collectionName),
    where(key, operator, value)
  );

  const querySnapshot = await getDocs(dataQuery);

  querySnapshot.forEach((doc) => {
    arr.push({ id: doc.id, ...doc.data() });
  });

  return arr;
};

export const getSnapShotData = async (
  collectionName: string,
  key: string,
  operator: WhereFilterOp,
  value: any
): Promise<void> => {
  const dataQuery = query(
    collection(db, collectionName),
    where(key, operator, value)
  );

  onSnapshot(dataQuery, (snapShot) => {
    const data = snapShot.docs.map((doc) => doc.data());
    console.log(data);
    return data;
  });
};

export const compoundQuery = async (
  collectionName: string,
  QueryArr: QueryCondition[]
): Promise<Document[]> => {
  const arr: Document[] = [];
  const queryParams: QueryConstraint[] = [];

  QueryArr.forEach((e) => {
    queryParams.push(where(e.key, e.operator, e.value));
  });

  const dataQuery = query(collection(db, collectionName), ...queryParams);

  const querySnapshot = await getDocs(dataQuery);

  querySnapshot.forEach((doc) => {
    arr.push({ id: doc.id, ...doc.data() });
  });

  return arr;
};

export const getLatestData = async (
  collectionName: string,
  QueryArr: QueryCondition[],
  _orderByKey?: string
): Promise<Document[]> => {
  const arr: Document[] = [];
  const queryParams: QueryConstraint[] = [];

  QueryArr.forEach((e) => {
    queryParams.push(where(e.key, e.operator, e.value));
  });

  const dataQuery = query(
    collection(db, collectionName), 
    ...queryParams,
    orderBy("created_at", "desc"),
    limit(1)
  );

  const querySnapshot = await getDocs(dataQuery);

  querySnapshot.forEach((doc) => {
    arr.push({ id: doc.id, ...doc.data() });
  });

  return arr;
};

export const getOrderByCollectionData = async (
  collectionName: string,
  orderByField: string,
  order: OrderByDirection = "asc"
): Promise<Document[]> => {
  const q = query(collection(db, collectionName), orderBy(orderByField, order));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getCompoundQueryLength = async (
  collectionName: string,
  QueryArr: QueryCondition[]
): Promise<number> => {
  try {
    const queryParams: QueryConstraint[] = [];

    QueryArr.forEach((e) => {
      queryParams.push(where(e.key, e.operator, e.value));
    });

    const dataQuery = query(collection(db, collectionName), ...queryParams);
    const snapshot = await getCountFromServer(dataQuery);

    return snapshot.data().count;
  } catch (err) {
    console.error("Error getting compound query length:", err);
    throw err;
  }
};