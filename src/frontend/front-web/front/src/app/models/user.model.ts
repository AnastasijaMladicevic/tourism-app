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

export interface UserDto {
  id?: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email: string;
  phoneNumber?: string;
  country?: string;
  language?: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  role?: string;
  roleName?: string;
  userType?: string;
  roles?: string[];
  profileImageUrl?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  rememberMe: boolean;
}


export interface AuthResponseDto {
  token: string;
  refreshToken: string;
  user: UserDto;
  expiresAt: string;
}