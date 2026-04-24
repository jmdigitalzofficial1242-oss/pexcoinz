import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface OrderItem {
  id: number;
  symbol: string;
  side: string;
  type: string;
  amount: number;
  price: number | null;
  status: string;
  filledAmount: number;
  avgPrice: number | null;
  total: number | null;
  createdAt: string;
}

export interface PlaceOrderInput {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  amount: number;
  price?: number | null;
  total?: number | null;
}

export interface CoinBalance {
  symbol: string;
  amount: number;
}

export interface OhlcPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CoinPnL {
  symbol: string;
  currentAmount: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlaceOrderInput) =>
      customFetch<OrderItem>("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/pnl"] });
    },
  });
}

export function useGetMyOrders() {
  return useQuery({
    queryKey: ["/api/orders"],
    queryFn: () => customFetch<OrderItem[]>("/api/orders"),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) =>
      customFetch<{ success: boolean }>(`/api/orders/${orderId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/balances"] });
    },
  });
}

export function useGetCoinBalances() {
  return useQuery({
    queryKey: ["/api/orders/balances"],
    queryFn: () => customFetch<CoinBalance[]>("/api/orders/balances"),
  });
}

export function useGetCoinOhlc(
  coinId: string,
  days: string,
  options?: { query?: { staleTime?: number; enabled?: boolean } }
) {
  return useQuery({
    queryKey: [`/api/crypto/ohlc/${coinId}`, days],
    queryFn: () => customFetch<OhlcPoint[]>(`/api/crypto/ohlc/${encodeURIComponent(coinId)}?days=${days}`),
    staleTime: days === "1" ? 120_000 : 600_000,
    ...options?.query,
  });
}

export function useGetPortfolioPnl(options?: { query?: { enabled?: boolean } }) {
  return useQuery({
    queryKey: ["/api/orders/pnl"],
    queryFn: () => customFetch<CoinPnL[]>("/api/orders/pnl"),
    ...options?.query,
  });
}

export function useGetBinanceStatus() {
  return useQuery({
    queryKey: ["/api/binance/status"],
    queryFn: () =>
      customFetch<{ configured: boolean; testnet: boolean; message: string }>("/api/binance/status"),
    staleTime: 60_000,
  });
}

export function usePlaceOrderBinance() {
  return useMutation({
    mutationFn: (data: {
      symbol: string;
      side: string;
      type: string;
      quantity: number;
      price?: number;
    }) =>
      customFetch<any>("/api/binance/order", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
  });
}
