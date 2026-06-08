import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { authService } from "../services/auth.service";
import { setCredentials } from "../features/auth/authSlice";

export const useAuthBootstrap = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    const loadUser = async () => {
      try {
        const user =
            await authService.getMe();

        dispatch(
          setCredentials({
            user,
            token,
          })
        );
      } catch (error) {
        localStorage.removeItem(
          "token"
        );
      }
    };

    loadUser();
  }, [dispatch]);
};