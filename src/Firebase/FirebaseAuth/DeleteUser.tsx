import { deleteUser } from "firebase/auth";
import { deleteDocument } from "../CloudFirestore/DeleteData";
import { deleteDeviceDocument } from "@/lib/deviceManager";
import { auth } from "../firebase";

/**
 * deleteUserData
 * ─────────────────────────────────────────────────────────────────────────────
 * Deletes the user account:
 *   1. Deletes `deviceLocations/{uid}` Firestore document
 *   2. Deletes `users/{uid}` Firestore document
 *   3. Deletes the Firebase Authentication account
 */
export const deleteUserData = async (id: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    // 1. Remove device tracking document
    try {
      await deleteDeviceDocument(id);
    } catch (err) {
      console.warn("[DeleteUser] Failed to delete deviceLocations document:", err);
    }

    // 2. Remove Firestore user document
    await deleteDocument("users", id);

    // 3. Remove Firebase Auth user
    await deleteUser(currentUser);

    return true;
  } catch (error) {
    console.error("[DeleteUser] Error:", error);
    return false;
  }
};
