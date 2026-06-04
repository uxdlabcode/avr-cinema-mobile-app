import { deleteUser } from "firebase/auth";

import { deleteDocument } from "../CloudFirestore/DeleteData";
import { auth } from "../firebase";

export const deleteUserData = async (id: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    await deleteUser(currentUser);
    await deleteDocument("users", id);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
