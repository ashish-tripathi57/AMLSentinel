export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  analyst: AnalystInfo;
}

export interface AnalystInfo {
  username: string;
  full_name: string;
  role: string;
}
