import { Router } from "express";
import { randomUUID } from "crypto";
import {
  expirationTimestamp,
  generateSessionToken,
  hashPassword,
  hashToken,
  verifyPassword
} from "../lib/auth.js";
import {
  createAuditLog,
  createSession,
  createUser,
  getInvestorById,
  findUserByEmail,
  getUsers,
  revokeSession
} from "../lib/repository.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", rateLimit({ windowMs: 60 * 1000, limit: 8 }), (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    createAuditLog({
      actorEmail: email,
      action: "auth.login",
      targetType: "session",
      status: "failed",
      details: {
        reason: "invalid_credentials"
      }
    });
    return res.status(401).json({
      ok: false,
      message: "Invalid email or password."
    });
  }

  const token = generateSessionToken();
  const session = createSession({
    id: `sess-${randomUUID().slice(0, 8)}`,
    userId: user.id,
    tokenHash: hashToken(token),
    createdAt: new Date().toISOString(),
    expiresAt: expirationTimestamp()
  });

  createAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    targetType: "session",
    targetId: session.id,
    status: "success",
    details: {
      role: user.role
    }
  });

  return res.json({
    ok: true,
    token,
    user: session.user,
    expiresAt: session.expiresAt
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: req.auth.user,
    expiresAt: req.auth.session.expiresAt
  });
});

router.post("/logout", requireAuth, (req, res) => {
  revokeSession(req.auth.session.id);
  createAuditLog({
    actorUserId: req.auth.user.id,
    actorEmail: req.auth.user.email,
    action: "auth.logout",
    targetType: "session",
    targetId: req.auth.session.id,
    status: "success"
  });
  res.json({
    ok: true,
    message: "Session closed."
  });
});

router.get("/users", requireRole(["admin"]), (_req, res) => {
  res.json({
    ok: true,
    items: getUsers()
  });
});

router.post("/users", requireRole(["admin"]), (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim();
    const role = String(req.body?.role || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !name || !role || !password) {
      throw new Error("Missing required user fields.");
    }

    const investorId = String(req.body?.investorId || "").trim() || null;

    if (!["admin", "operator", "viewer", "investor"].includes(role)) {
      throw new Error("Role must be admin, operator, viewer, or investor.");
    }

    if (role === "investor") {
      if (!investorId) {
        throw new Error("Investor users must be linked to an investor profile.");
      }

      if (!getInvestorById(investorId)) {
        throw new Error("Linked investor profile was not found.");
      }
    }

    if (findUserByEmail(email)) {
      throw new Error("A user with that email already exists.");
    }

    const user = createUser({
      id: `user-${randomUUID().slice(0, 8)}`,
      email,
      name,
      role,
      investorId,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    createAuditLog({
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: "user.create",
      targetType: "user",
      targetId: user.id,
      status: "success",
      details: {
        email: user.email,
        role: user.role,
        investorId: user.investorId
      }
    });

    return res.status(201).json({
      ok: true,
      user
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message || "Unable to create user."
    });
  }
});

export default router;
