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
  preferredRegionId?: number | null;
  preferredRegionName?: string | null;
  preferredRegionCode?: string | null;
  publicAppHomeUrl?: string | null;
  isBanned?: boolean;
  banReason?: string | null;
  banExpiresAtUtc?: string | null;
  bannedAtUtc?: string | null;
}

/** Matches TuristickiVodic.Core.DTO.UpdateUserDto — profile fields admins may update (email is not included). */
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  country?: string;
  language?: string;
}

/** Matches TuristickiVodic.Core.DTO.ChangePasswordDto — admin may reset another user's password without knowing the current one. */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
