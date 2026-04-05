import { Request, Response, NextFunction } from "express";
import { User } from "@workspace/db";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    roleId: "ADMIN" | "TRAINER" | "LEARNER";
    email: string;
  };
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cookieVal = req.cookies?.lms_user;
    if (!cookieVal) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    let cookieData: any;
    try {
      cookieData = JSON.parse(cookieVal);
    } catch {
      return res.status(401).json({ message: "Invalid session" });
    }

    const userId = cookieData.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid session data" });
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive || user.isDeleted) {
      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("lms_user", { 
        path: "/",
        secure: isProd,
        sameSite: isProd ? "none" : "lax"
      });
      return res.status(401).json({ message: "User not found or inactive" });
    }

    req.user = {
      id: user.id,
      roleId: user.roleId as any,
      email: user.email,
    };

    next();
    return;
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.roleId)) {
      return res.status(403).json({ message: "Forbidden: You do not have the required permissions" });
    }
    next();
    return;
  };
};
