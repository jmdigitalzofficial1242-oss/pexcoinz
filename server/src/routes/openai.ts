import { Router } from "express";
import { getAuthUser } from "./auth";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import { SendOpenaiMessageBody, CreateOpenaiConversationBody } from "../lib/schemas";

const router = Router();

const TRADING_SYSTEM_PROMPT = `You are PexCoin AI, an expert crypto trading assistant for the PexCoin trading platform.

You help users with:
- Cryptocurrency market analysis and insights
- Trading strategies (DCA, swing trading, scalping, etc.)
- Understanding technical indicators (RSI, MACD, Bollinger Bands, etc.)
- Portfolio management and risk assessment
- Explaining blockchain concepts and crypto fundamentals
- News and market sentiment analysis

Always be helpful, clear, and remind users that crypto trading involves risk and this is not financial advice.
Keep responses concise and actionable. Use bullet points for lists. Format prices with $ signs.`;

// Simple AI response when OpenAI is not available
function generateSimpleResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes("bitcoin") || msg.includes("btc")) {
    return "📊 **Bitcoin (BTC)** is the world's first and largest cryptocurrency by market cap. It's often called 'digital gold' and serves as a store of value.\n\n**Key points:**\n- Bitcoin has a fixed supply of 21 million coins\n- It uses Proof of Work consensus\n- BTC typically leads market trends\n\n⚠️ *This is not financial advice. Always do your own research.*";
  }
  if (msg.includes("ethereum") || msg.includes("eth")) {
    return "📊 **Ethereum (ETH)** is the leading smart contract platform, powering DeFi, NFTs, and thousands of dApps.\n\n**Key points:**\n- ETH 2.0 uses Proof of Stake\n- Gas fees vary based on network demand\n- Strong developer ecosystem\n\n⚠️ *This is not financial advice. Always do your own research.*";
  }
  if (msg.includes("trade") || msg.includes("buy") || msg.includes("sell")) {
    return "📈 **Trading Tips:**\n\n1. **Never invest more than you can afford to lose**\n2. Use stop-loss orders to manage risk\n3. Dollar-cost averaging (DCA) reduces timing risk\n4. Diversify your portfolio\n5. Keep emotions in check\n\n**Popular strategies:**\n- 🔄 **DCA**: Buy fixed amounts at regular intervals\n- 📊 **Swing Trading**: Hold for days/weeks based on trends\n- ⚡ **Day Trading**: Short-term trades (high risk)\n\n⚠️ *This is not financial advice.*";
  }
  if (msg.includes("portfolio") || msg.includes("diversi")) {
    return "💼 **Portfolio Management:**\n\n**Suggested allocation (moderate risk):**\n- 40-50% Bitcoin (BTC)\n- 20-30% Ethereum (ETH)\n- 10-20% Large-cap altcoins (SOL, BNB, ADA)\n- 5-10% Small-cap/high-risk projects\n- 5-10% Stablecoins (reserve for dips)\n\n**Key rules:**\n- Rebalance quarterly\n- Take profits on significant gains\n- Never go all-in on one asset\n\n⚠️ *This is not financial advice.*";
  }
  
  return "🤖 **PexCoin AI Assistant**\n\nI can help you with:\n- **Market Analysis**: Ask about any cryptocurrency\n- **Trading Strategies**: DCA, swing trading, etc.\n- **Technical Analysis**: RSI, MACD, support/resistance\n- **Portfolio Tips**: Diversification and risk management\n- **Crypto Basics**: Blockchain, wallets, staking\n\nJust ask me anything about crypto trading! 📈\n\n⚠️ *Remember: Crypto trading involves risk. This is not financial advice.*";
}

router.get("/openai/conversations", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const convos = await Conversation.find({ userId: auth.userId }).sort({ createdAt: 1 });
  res.json(convos.map(c => ({
    id: c._id.toString(),
    title: c.title,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const convo = await Conversation.create({ title: parsed.data.title, userId: auth.userId });
  res.status(201).json({
    id: convo._id.toString(),
    title: convo.title,
    createdAt: convo.createdAt.toISOString(),
  });
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const convo = await Conversation.findById(req.params.id);
  if (!convo || convo.userId !== auth.userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });
  res.json({
    id: convo._id.toString(),
    title: convo.title,
    createdAt: convo.createdAt.toISOString(),
    messages: msgs.map(m => ({
      id: m._id.toString(),
      conversationId: convo._id.toString(),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const convo = await Conversation.findById(req.params.id);
  if (!convo || convo.userId !== auth.userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await Message.deleteMany({ conversationId: convo._id });
  await Conversation.findByIdAndDelete(convo._id);
  res.status(204).send();
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const msgs = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
  res.json(msgs.map(m => ({
    id: m._id.toString(),
    conversationId: req.params.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const convo = await Conversation.findById(req.params.id);
  if (!convo || convo.userId !== auth.userId) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  // Save user message
  await Message.create({
    conversationId: convo._id,
    role: "user",
    content: parsed.data.content,
  });

  // Generate response (built-in, no OpenAI needed)
  const aiResponse = generateSimpleResponse(parsed.data.content);

  // Save AI response
  await Message.create({
    conversationId: convo._id,
    role: "assistant",
    content: aiResponse,
  });

  // Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send response in chunks to simulate streaming
  const words = aiResponse.split(" ");
  let current = "";
  for (let i = 0; i < words.length; i++) {
    current = words[i] + (i < words.length - 1 ? " " : "");
    res.write(`data: ${JSON.stringify({ content: current })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
