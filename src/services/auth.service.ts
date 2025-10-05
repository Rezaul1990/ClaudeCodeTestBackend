import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';

export const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'staff']).default('staff')
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type SignupData = z.infer<typeof signupSchema>;
export type SigninData = z.infer<typeof signinSchema>;

export const register = async (data: SignupData) => {
  const existing = await UserModel.findByEmail(data.email);
  if (existing) throw new Error('Email already exists');

  const passwordHash = UserModel.hashPassword(data.password);
  const user = new UserModel({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    passwordHash,
    role: data.role || 'staff'
  });

  await user.save();
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role
  };
};

export const login = async (data: SigninData) => {
  const user = await UserModel.findByEmail(data.email);
  if (!user || !UserModel.verifyPassword(data.password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }

  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role
  };
};

export const issueJwt = (payload: object, options: { secret: string; expiresIn: string }): string => {
  return jwt.sign(payload, options.secret, { expiresIn: options.expiresIn } as jwt.SignOptions);
};