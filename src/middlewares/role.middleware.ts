import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const authorize = (...roles: ('ADMIN' | 'USER' | 'SUBADMIN')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: `User role ${req.user?.role} is not authorized` });
      return;
    }
    next();
  };
};