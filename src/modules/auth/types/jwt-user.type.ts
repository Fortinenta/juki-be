export interface JwtUser {
  id: string;
  email: string;
  roles: string[];
  status?: string;
}
