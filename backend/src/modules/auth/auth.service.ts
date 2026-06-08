import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/dbconfig";
import { ApiError } from "../../shared/utils/ApiError";
import { LoginBody, RegisterBody } from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment variables");
}

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";

type JwtPayload = {
  userId: string;
  email: string;
};

const signToken = (payload: JwtPayload) => {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: TOKEN_EXPIRES_IN,
  });
};

const mapUser = (user: {
  user_id: string;
  username: string;
  email: string;
  profile_image: string | null;
  created_at: Date;
}) => ({
  userId: user.user_id,
  username: user.username,
  email: user.email,
  profileImage: user.profile_image,
  createdAt: user.created_at,
});

export const authService = {
  register: async (body: RegisterBody) => {
    const username = body.username.trim();
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const profileImage = body.profileImage ?? null;

    const existingUser = await pool.query(
      `SELECT user_id
       FROM users
       WHERE LOWER(email) = $1 OR LOWER(username) = $2`,
      [email, username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new ApiError(409, "User already exists with this email or username");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, profile_image)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id, username, email, profile_image, created_at`,
        [username, email, passwordHash, profileImage]
      );

      const user = mapUser(result.rows[0]);

      const token = signToken({
        userId: user.userId,
        email: user.email,
      });

      return {
        user,
        token,
      };
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ApiError(409, "User already exists with this email or username");
      }

      throw error;
    }
  },

  login: async (body: LoginBody) => {
    const email = body.email.trim().toLowerCase();
    const password = body.password;

    const result = await pool.query(
      `SELECT user_id, username, email, password_hash, profile_image, created_at
       FROM users
       WHERE LOWER(email) = $1 AND is_active = true
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, "Invalid email or password");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = signToken({
      userId: user.user_id,
      email: user.email,
    });

    const safeUser = mapUser(user);

    return {
      user: safeUser,
      token,
    };
  },

  getMe: async (userId: string) => {
    const result = await pool.query(
      `SELECT user_id, username, email, profile_image, created_at
       FROM users
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    return mapUser(result.rows[0]);
  },

  forgotPassword: async (email: string) => {
    const emailLower = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT user_id
       FROM users
       WHERE LOWER(email) = $1 AND is_active = true
       LIMIT 1`,
      [emailLower]
    );
    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found with this email");
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET reset_code = $1, reset_code_expires_at = $2
       WHERE LOWER(email) = $3`,
      [code, expiresAt, emailLower]
    );

    console.log(`\n======================================================`);
    console.log(`🔑 PASSWORD RESET CODE FOR ${emailLower}: [ ${code} ]`);
    console.log(`======================================================\n`);

    return {
      message: "Reset code generated",
      code, // return for easy testing in development/sandbox
    };
  },

  verifyResetCode: async (email: string, code: string) => {
    const emailLower = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT reset_code, reset_code_expires_at
       FROM users
       WHERE LOWER(email) = $1 AND is_active = true
       LIMIT 1`,
      [emailLower]
    );
    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }
    const user = result.rows[0];
    if (!user.reset_code || user.reset_code !== code) {
      throw new ApiError(400, "Invalid reset code");
    }
    if (new Date() > new Date(user.reset_code_expires_at)) {
      throw new ApiError(400, "Reset code has expired");
    }
    return { valid: true };
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    const emailLower = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT user_id, reset_code, reset_code_expires_at
       FROM users
       WHERE LOWER(email) = $1 AND is_active = true
       LIMIT 1`,
      [emailLower]
    );
    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }
    const user = result.rows[0];
    if (!user.reset_code || user.reset_code !== code) {
      throw new ApiError(400, "Invalid reset code");
    }
    if (new Date() > new Date(user.reset_code_expires_at)) {
      throw new ApiError(400, "Reset code has expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, reset_code = NULL, reset_code_expires_at = NULL
       WHERE user_id = $2`,
      [passwordHash, user.user_id]
    );
    return { success: true };
  },
};