export class AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export class ProfileResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  avatar: string | null;
  bio: string | null;
  dateOfBirth: Date | null;
}

export class UserResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  profile?: ProfileResponse;
}

export class AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class MeResponse {
  id: string;
  email: string;
  role: string;
}
