// layouts/MainLayout.tsx

import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Chatbot from "../components/chatbot/Chatbot";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Chatbot />
    </div>
  );
};

export default MainLayout;