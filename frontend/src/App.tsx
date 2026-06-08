
import AppRoutes from "./routes/AppRoutes";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";

function App() {
  useAuthBootstrap();
  return <AppRoutes />;
}

export default App;