export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: string[];
}

export interface JwtResponse {
  accessToken: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}
