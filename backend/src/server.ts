import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { testDbConnection } from "./config/dbconfig";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testDbConnection();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();