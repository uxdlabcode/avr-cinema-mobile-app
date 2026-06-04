import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";


export const useLogout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("userInfo");
      navigate("/signin");
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  return logout;
};