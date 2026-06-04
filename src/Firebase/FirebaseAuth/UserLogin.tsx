import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

// Login users using their Email and Password
export const emailPasswordLogin = async (mail: string, pass: string) => {
  const res = await signInWithEmailAndPassword(auth, mail, pass).catch(() => {
    return false;
  });

  return res;
};
