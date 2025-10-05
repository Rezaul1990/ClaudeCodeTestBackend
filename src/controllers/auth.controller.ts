import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { register, login, issueJwt, signupSchema, signinSchema } from '../services/auth.service';

export const signup = async (req: Request, res: Response) => {
  try {
    const data = signupSchema.parse(req.body);
    const user = await register(data);
    const token = issueJwt(user, {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRE!
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const data = signinSchema.parse(req.body);
    const user = await login(data);
    const token = issueJwt(user, {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRE!
    });

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    res.json(decoded);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const signout = async (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Signed out' });
};