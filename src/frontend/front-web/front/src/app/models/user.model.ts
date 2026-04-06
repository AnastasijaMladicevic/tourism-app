export interface CreateUserDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  password: string;
  phoneNumber: string;
  country: string;
  language: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
}