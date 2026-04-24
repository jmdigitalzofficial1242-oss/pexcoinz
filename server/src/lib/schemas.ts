/**
 * PexCoin API Zod Schemas (Standalone - no workspace dependency)
 */
import * as zod from "zod";

export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

export const RegisterBody = zod.object({
  email: zod.string(),
  password: zod.string(),
  name: zod.string(),
  phone: zod.string().nullish(),
  country: zod.string().nullish(),
  address: zod.string().nullish(),
  inviteCode: zod.string(),
});

export const LoginBody = zod.object({
  email: zod.string(),
  password: zod.string(),
});

export const LoginResponse = zod.object({
  user: zod.object({
    id: zod.string(),
    email: zod.string(),
    name: zod.string(),
    phone: zod.string().nullish(),
    role: zod.string(),
    createdAt: zod.string(),
    inviteCode: zod.string().optional(),
    referredBy: zod.string().nullish(),
    commissionEarned: zod.number().optional(),
  }),
  token: zod.string(),
});

export const LogoutResponse = zod.object({
  message: zod.string(),
});

export const GetMeResponse = zod.object({
  id: zod.string(),
  email: zod.string(),
  name: zod.string(),
  phone: zod.string().nullish(),
  role: zod.string(),
  createdAt: zod.string(),
  inviteCode: zod.string().optional(),
  referredBy: zod.string().nullish(),
  commissionEarned: zod.number().optional(),
});

export const GetCryptoPricesResponseItem = zod.object({
  symbol: zod.string(),
  name: zod.string(),
  price: zod.number(),
  change: zod.number(),
  iconUrl: zod.string().nullish(),
  marketCap: zod.number().nullish(),
  volume: zod.number().nullish(),
  high24h: zod.number().nullish(),
  low24h: zod.number().nullish(),
  sparkline: zod.array(zod.number()).nullish(),
});
export const GetCryptoPricesResponse = zod.array(GetCryptoPricesResponseItem);

export const GetCoinChartResponseItem = zod.object({
  time: zod.number(),
  price: zod.number(),
});
export const GetCoinChartResponse = zod.array(GetCoinChartResponseItem);

export const GetMarketTickerResponseItem = zod.object({
  pair: zod.string(),
  price: zod.number(),
  change: zod.number(),
});
export const GetMarketTickerResponse = zod.array(GetMarketTickerResponseItem);

export const AdminLoginBody = zod.object({
  username: zod.string(),
  password: zod.string(),
});

export const AdminLoginResponse = zod.object({
  token: zod.string(),
  role: zod.string(),
});

export const AdminGetUserParams = zod.object({
  id: zod.coerce.string(),
});

export const AdminUpdateUserParams = zod.object({
  id: zod.coerce.string(),
});

export const AdminUpdateUserBody = zod.object({
  status: zod.string().nullish(),
  usdtBalance: zod.number().nullish(),
  btcBalance: zod.number().nullish(),
  ethBalance: zod.number().nullish(),
  role: zod.string().nullish(),
});

export const AdminApproveTransactionParams = zod.object({
  id: zod.coerce.string(),
});

export const AdminRejectTransactionParams = zod.object({
  id: zod.coerce.string(),
});

export const AdminGetStatsResponse = zod.object({
  totalUsers: zod.number(),
  totalDeposits: zod.number(),
  totalWithdrawals: zod.number(),
  pendingTransactions: zod.number(),
  activeUsers: zod.number(),
});

export const PlaceOrderBody = zod.object({
  symbol: zod.string(),
  side: zod.enum(["buy", "sell"]),
  type: zod.enum(["market", "limit"]),
  amount: zod.number(),
  price: zod.number().nullish(),
  total: zod.number().nullish(),
});

export const PlaceOrderResponse = zod.object({
  id: zod.any(),
  symbol: zod.string(),
  side: zod.string(),
  type: zod.string(),
  amount: zod.number(),
  price: zod.number().nullish(),
  status: zod.string(),
  filledAmount: zod.number(),
  avgPrice: zod.number().nullish(),
  total: zod.number().nullish(),
  createdAt: zod.string(),
});

export const GetMyOrdersResponse = zod.array(PlaceOrderResponse);

export const SendOpenaiMessageBody = zod.object({
  content: zod.string(),
});

export const CreateOpenaiConversationBody = zod.object({
  title: zod.string(),
});
