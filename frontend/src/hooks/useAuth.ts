// hooks/useAuth.ts

import { useSelector } from "react-redux";

export const useAuth = () =>
  useSelector(
    (state: any) => state.auth
  );