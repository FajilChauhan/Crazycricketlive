export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  profileImage?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthUser {
  user_id: string;
  username: string;
  email: string;
  profile_image: string | null;
  created_at: Date;
}