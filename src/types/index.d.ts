export type UserRole = 'admin' | 'manager' | 'staff';

export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
};