import {
  sendPasswordResetEmail,
  EmailAuthProvider,
  updatePassword,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../firebase";

export const UserForgotPassword = async (mail: string) => {
  const res = await sendPasswordResetEmail(auth, mail);
  return res;
};

export const ForgotPassword = async (password: string, newPassword: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("No authenticated user");
    }

    // Get the user's credentials and reauthenticate the user
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);

    // Change the user's password
    await updatePassword(currentUser, newPassword);
  } catch (error) {
    console.log(error);
  }
};


