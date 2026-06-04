
import { updateProfile, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

// SignUp users using their Email and Password
export const emailPasswordSignUp = async (name: string, mail: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, mail, pass);
    const data = {
      uid: result.user.uid,
      email: result.user.email,
    };

    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
    }

    return data;
  } catch (err: any) {
    return { error: true, code: err.code || null, message: err.message || String(err) };
  }
};

export const updateName = async (nameOne: string, nameTwo?: string) => {
  if (!auth.currentUser) throw new Error("No authenticated user");
  const res = await updateProfile(auth.currentUser, {
    displayName: nameOne || nameTwo,
  });

  return res;
};
