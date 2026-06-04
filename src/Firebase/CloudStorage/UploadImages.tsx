import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { storage } from "../firebase";

// Upload Image to Firebase Cloud Storage
export const UploadImage = async (imageFile: File) => {
  // const imgName = crypto.randomUUID();

  const storageRef = ref(storage, `images/${imageFile.name}${Math.random()}.jpg`);

  const upload = await uploadBytes(storageRef, imageFile);
  const downloadURL = await getDownloadURL(upload.ref);
  console.log(downloadURL);
  return downloadURL;
};



export const deleteImage = async (imageUrl: string) => {
  try{

  const storageRef = ref(storage, imageUrl);
  await deleteObject(storageRef);
  return true;
  }catch(err){
    
    return true;

  }
    
};
