import { Router } from "express";
import { getAuthUser } from "./auth";
import SupportTicket from "../models/SupportTicket";
import SupportMessage from "../models/SupportMessage";
import User from "../models/User";

const router: any = Router();

function requireAuth(req: any, res: any): any | null {
  const user = getAuthUser(req);
  if (!user) { 
    if (!res.headersSent) {
      res.status(401).json({ error: "Unauthorized" }); 
    }
    return null; 
  }
  return user;
}

function isAdminUser(user: any): boolean {
  return user?.role === "admin" || user?.role === "super_admin";
}

// ─── CLIENT: Get or create my support ticket ─────────────────────────────────
router.get("/support/ticket", async (req: any, res: any) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  let ticket = await SupportTicket.findOne({ userId: authUser.userId });
  if (!ticket) {
    ticket = await SupportTicket.create({
      userId: authUser.userId,
      subject: "Support Request",
      status: "open",
    });
    await SupportMessage.create({
      ticketId: ticket._id,
      senderId: null,
      senderRole: "admin",
      content: "👋 Welcome to PexCoin Support! How can we help you today? Describe your issue and our team will assist you.",
      isRead: true,
    });
  }

  const messages = await SupportMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 });

  // Mark admin messages as read
  await SupportMessage.updateMany(
    { ticketId: ticket._id, senderRole: "admin", isRead: false },
    { isRead: true }
  );

  res.json({ ticket, messages });
});

// ─── CLIENT: Send a message ───────────────────────────────────────────────────
router.post("/support/messages", async (req: any, res: any) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });

  let ticket = await SupportTicket.findOne({ userId: authUser.userId });
  if (!ticket) {
    ticket = await SupportTicket.create({
      userId: authUser.userId,
      subject: "Support Request",
      status: "open",
    });
  }

  const msg = await SupportMessage.create({
    ticketId: ticket._id,
    senderId: authUser.userId,
    senderRole: "user",
    content: content.trim(),
    isRead: false,
  });

  ticket.lastMessageAt = new Date();
  ticket.status = "open";
  await ticket.save();

  res.json(msg);
});

// ─── CLIENT: Count unread admin messages ─────────────────────────────────────
router.get("/support/unread", async (req: any, res: any) => {
  const authUser = requireAuth(req, res);
  if (!authUser) return;

  const ticket = await SupportTicket.findOne({ userId: authUser.userId });
  if (!ticket) return res.json({ count: 0 });

  const count = await SupportMessage.countDocuments({
    ticketId: ticket._id,
    senderRole: "admin",
    isRead: false,
  });

  res.json({ count });
});

// ─── ADMIN: Get all support tickets ──────────────────────────────────────────
router.get("/admin/support/tickets", async (req: any, res: any) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdminUser(authUser)) return res.status(403).json({ error: "Forbidden" });

  const tickets = await SupportTicket.find().sort({ lastMessageAt: -1 });

  // Enrich tickets with user info
  const enriched = await Promise.all(tickets.map(async (t: any) => {
    const user = await User.findById(t.userId).select("name email");
    return {
      id: t._id.toString(),
      userId: t.userId,
      subject: t.subject,
      status: t.status,
      lastMessageAt: t.lastMessageAt,
      createdAt: t.createdAt,
      userName: user?.name || "Unknown",
      userEmail: user?.email || "Unknown",
    };
  }));

  res.json(enriched);
});

// ─── ADMIN: Get messages for a ticket ────────────────────────────────────────
router.get("/admin/support/tickets/:ticketId", async (req: any, res: any) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdminUser(authUser)) return res.status(403).json({ error: "Forbidden" });

  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const user = await User.findById(ticket.userId).select("name email");
  const messages = await SupportMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 });

  // Mark user messages as read
  await SupportMessage.updateMany(
    { ticketId: ticket._id, senderRole: "user", isRead: false },
    { isRead: true }
  );

  res.json({
    ticket: {
      id: ticket._id.toString(),
      userId: ticket.userId,
      subject: ticket.subject,
      status: ticket.status,
      lastMessageAt: ticket.lastMessageAt,
      createdAt: ticket.createdAt,
      userName: user?.name || "Unknown",
      userEmail: user?.email || "Unknown",
    },
    messages,
  });
});

// ─── ADMIN: Reply to a ticket ─────────────────────────────────────────────────
router.post("/admin/support/tickets/:ticketId/messages", async (req: any, res: any) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdminUser(authUser)) return res.status(403).json({ error: "Forbidden" });

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });

  const msg = await SupportMessage.create({
    ticketId: req.params.ticketId,
    senderId: authUser.userId,
    senderRole: "admin",
    content: content.trim(),
    isRead: false,
  });

  await SupportTicket.findByIdAndUpdate(req.params.ticketId, {
    lastMessageAt: new Date(),
    status: "answered",
  });

  res.json(msg);
});

// ─── ADMIN: Update ticket status ──────────────────────────────────────────────
router.patch("/admin/support/tickets/:ticketId", async (req: any, res: any) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdminUser(authUser)) return res.status(403).json({ error: "Forbidden" });

  const { status } = req.body;
  await SupportTicket.findByIdAndUpdate(req.params.ticketId, { status });
  res.json({ success: true });
});

// ─── ADMIN: Unread count from users ──────────────────────────────────────────
router.get("/admin/support/unread", async (req: any, res: any) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });
  if (!isAdminUser(authUser)) return res.status(403).json({ error: "Forbidden" });

  const count = await SupportMessage.countDocuments({
    senderRole: "user",
    isRead: false,
  });

  res.json({ count });
});

export default router;
