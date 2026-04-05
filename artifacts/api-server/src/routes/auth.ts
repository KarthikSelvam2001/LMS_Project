import { Router, type IRouter, type Request, type Response } from "express";
import { User } from "@workspace/db";

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = "685512374164-703ql8tr6ql5ipg8kb204f9qpjsjroun.apps.googleusercontent.com";
const DEFAULT_PASSWORD = "LMS@2026";

function formatUser(user: any) {
  return {
    id: user.id || user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    roleId: user.roleId,
    picture: user.picture || "",
    provider: user.provider || "local",
    isActive: user.isActive,
    isDeleted: user.isDeleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function setUserCookie(res: Response, user: any) {
  const sessionData = { id: user.id || user._id };
  const isProd = process.env.NODE_ENV === "production";
  
  res.cookie("lms_user", JSON.stringify(sessionData), {
    httpOnly: true, // More secure
    secure: isProd, // Must be true for sameSite: "none"
    sameSite: isProd ? "none" : "lax", // "none" required for cross-site cookies on Render
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return formatUser(user);
}

// --- Google SSO Login/Signup ---
router.post("/auth/google", async (req: Request, res: Response): Promise<void> => {
  console.log(">>> [DEBUG] /api/auth/google hit at:", new Date().toISOString());
  try {
    const { token } = req.body;
    console.log("Received Google auth request, token length:", token?.length);
    if (!token) {
      res.status(400).json({ message: "Google token is required" });
      return;
    }

    // Verify token with Google's public tokeninfo endpoint
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );

    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      console.error("Google tokeninfo error:", googleRes.status, errorText);
      res.status(401).json({ message: "Invalid Google token" });
      return;
    }

    const payload: any = await googleRes.json();
    console.log("Google token payload:", JSON.stringify(payload, null, 2));

    // Validate token is for our app
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.error("Token audience mismatch:", payload.aud, "expected:", GOOGLE_CLIENT_ID);
      res.status(401).json({ message: "Token audience mismatch" });
      return;
    }

    const { email, given_name, family_name, name, picture } = payload;

    if (!email) {
      res.status(400).json({ message: "Email not provided by Google" });
      return;
    }

    // Find or create user — no duplicates
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // Existing user: update picture if changed
      if (picture && user.picture !== picture) {
        user.picture = picture;
        await user.save();
      }
    } else {
      // New user: auto-signup with default role LEARNER
      const nameParts = name ? name.split(" ") : [];
      const firstName = given_name || nameParts[0] || email.split("@")[0];
      const lastName = (family_name || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")) || ".";

      user = new User({
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        password: DEFAULT_PASSWORD,
        provider: "google",
        picture: picture || "",
        roleId: "LEARNER",
        isActive: true,
        isDeleted: false,
        createdBy: "GOOGLE_SSO",
        updatedBy: "GOOGLE_SSO",
      });

      await user.save();
    }

    if (user.isDeleted) {
      res.status(401).json({ message: "Account not found" });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({ message: "Account is deactivated" });
      return;
    }

    const userData = setUserCookie(res, user);
    res.json({ user: userData, message: "Login successful" });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Google authentication failed" });
  }
});

// --- Traditional Login (kept for compatibility) ---
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    if (user.isDeleted) {
      res.status(401).json({ message: "Account not found" });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({ message: "Account is deactivated" });
      return;
    }
    if (user.password !== password) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const userData = setUserCookie(res, user);
    res.json({ user: userData, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// --- Logout ---
router.post("/auth/logout", (_req: Request, res: Response): void => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("lms_user", { 
    path: "/",
    secure: isProd,
    sameSite: isProd ? "none" : "lax" 
  });
  res.json({ message: "Logged out successfully" });
});

// --- Get current user ---
router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const cookieVal = req.cookies?.lms_user;
    if (!cookieVal) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    let cookieData: any;
    try {
      cookieData = JSON.parse(cookieVal);
    } catch {
      res.status(401).json({ message: "Invalid session" });
      return;
    }

    const user = await User.findById(cookieData.id);
    if (!user || !user.isActive || user.isDeleted) {
      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("lms_user", { 
        path: "/",
        secure: isProd,
        sameSite: isProd ? "none" : "lax"
      });
      res.status(401).json({ message: "Session expired" });
      return;
    }

    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get user" });
  }
});

export default router;
