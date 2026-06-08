export interface GetAllUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UpdateUserBody {
  username?: string;
  profileImage?: string;
}

export interface UserResponse {
  userId: string;
  username: string;
  email: string;
  profileImage: string | null;
  createdAt: Date;
}
