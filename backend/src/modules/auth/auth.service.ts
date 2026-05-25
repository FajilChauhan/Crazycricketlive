import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/dbconfig";
import { LoginBody, RegisterBody } from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

export const authService = {
  register: async (body: RegisterBody) => {
    const { username, email, password, profileImage } = body;

    const existingUser = await pool.query(
      `SELECT user_id FROM users WHERE email = $1 OR username = $2`,
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("User already exists with this email or username");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, profile_image)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, email, profile_image, created_at`,
      [username, email, passwordHash, profileImage || null]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      user,
      token,
    };
  },

  login: async (body: LoginBody) => {
    const { email, password } = body;

    const result = await pool.query(
      `SELECT user_id, username, email, password_hash, profile_image, created_at
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    delete user.password_hash;

    return {
      user,
      token,
    };
  },

  getMe: async (userId: string) => {
    const result = await pool.query(
      `SELECT user_id, username, email, profile_image, created_at
       FROM users
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  },
};