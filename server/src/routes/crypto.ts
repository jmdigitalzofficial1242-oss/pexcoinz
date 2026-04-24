import { Router } from "express";
import {
  GetCryptoPricesResponse,
  GetMarketTickerResponse,
  GetCoinChartResponse,
} from "../lib/schemas";

const router = Router();

// --- CoinGecko ID mapping ---
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
  LTC: "litecoin",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  SHIB: "shiba-inu",
  UNI: "uniswap",
  ATOM: "cosmos",
  BCH: "bitcoin-cash",
  ETC: "ethereum-classic",
  FIL: "filecoin",
  TON: "toncoin",
  XLM: "stellar",
  ALGO: "algorand",
  VET: "vechain",
  EOS: "eos",
  AAVE: "aave",
  TRX: "tron",
  USDC: "usd-coin",
  ICP: "internet-computer",
  THETA: "theta-network",
  FLOW: "flow",
};

// Top 28 coins to display (CoinGecko IDs)
const TOP_COIN_IDS = [
  "bitcoin", "ethereum", "binancecoin", "solana", "cardano",
  "ripple", "dogecoin", "polkadot", "litecoin", "avalanche-2",
  "matic-network", "chainlink", "shiba-inu", "uniswap", "cosmos",
  "bitcoin-cash", "ethereum-classic", "toncoin", "stellar", "algorand",
  "tron", "usd-coin", "internet-computer", "aave", "filecoin",
  "flow", "eos", "theta-network",
];

// --- Simple in-memory cache ---
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache: Record<string, CacheEntry<any>> = {};

function getCache<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache[key] = { data, expiresAt: Date.now() + ttlMs };
}

// --- CoinGecko fetch helper ---
async function coingeckoFetch(path: string): Promise<any> {
  const url = `https://api.coingecko.com/api/v3${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PexCoin/1.0",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

// --- Fallback data (used when CoinGecko is unavailable) ---
const FALLBACK_COINS = [
  { id: "bitcoin",       symbol: "BTC", name: "Bitcoin",          price: 67234.50, change: 2.45,  marketCap: 1321000000000, volume: 28700000000, high24h: 68100.00, low24h: 65800.00 },
  { id: "ethereum",      symbol: "ETH", name: "Ethereum",         price: 3542.20,  change: 3.12,  marketCap:  425000000000, volume: 14200000000, high24h:  3620.00, low24h:  3420.00 },
  { id: "binancecoin",   symbol: "BNB", name: "BNB",              price: 587.40,   change: 1.28,  marketCap:   85000000000, volume:  1700000000, high24h:   598.00, low24h:   575.00 },
  { id: "solana",        symbol: "SOL", name: "Solana",           price: 182.60,   change: 4.87,  marketCap:   80000000000, volume:  3200000000, high24h:   188.00, low24h:   174.00 },
  { id: "ripple",        symbol: "XRP", name: "XRP",              price: 0.6123,   change: 1.34,  marketCap:   33000000000, volume:  1100000000, high24h:     0.63, low24h:     0.59 },
  { id: "cardano",       symbol: "ADA", name: "Cardano",          price: 0.4523,   change: -0.82, marketCap:   16000000000, volume:   480000000, high24h:     0.47, low24h:     0.44 },
  { id: "dogecoin",      symbol: "DOGE",name: "Dogecoin",         price: 0.1632,   change: 2.91,  marketCap:   23000000000, volume:   980000000, high24h:     0.17, low24h:     0.15 },
  { id: "polkadot",      symbol: "DOT", name: "Polkadot",         price: 7.34,     change: -1.23, marketCap:    9700000000, volume:   310000000, high24h:     7.60, low24h:     7.10 },
  { id: "litecoin",      symbol: "LTC", name: "Litecoin",         price: 84.20,    change: 0.76,  marketCap:    6200000000, volume:   420000000, high24h:    85.80, low24h:    82.40 },
  { id: "avalanche-2",   symbol: "AVAX",name: "Avalanche",        price: 36.80,    change: 3.45,  marketCap:   15000000000, volume:   650000000, high24h:    38.20, low24h:    35.10 },
  { id: "matic-network", symbol: "MATIC",name: "Polygon",         price: 0.8234,   change: 2.18,  marketCap:    8100000000, volume:   370000000, high24h:     0.85, low24h:     0.80 },
  { id: "chainlink",     symbol: "LINK",name: "Chainlink",        price: 15.42,    change: 1.94,  marketCap:    9000000000, volume:   480000000, high24h:    16.00, low24h:    14.90 },
  { id: "shiba-inu",     symbol: "SHIB",name: "Shiba Inu",        price: 0.00002134,change: 3.67, marketCap:   12500000000, volume:   700000000, high24h: 0.0000224, low24h: 0.0000205 },
  { id: "uniswap",       symbol: "UNI", name: "Uniswap",          price: 10.23,    change: 1.45,  marketCap:    6100000000, volume:   280000000, high24h:    10.60, low24h:     9.90 },
  { id: "cosmos",        symbol: "ATOM",name: "Cosmos",           price: 9.87,     change: -0.56, marketCap:    3800000000, volume:   165000000, high24h:    10.20, low24h:     9.60 },
  { id: "bitcoin-cash",  symbol: "BCH", name: "Bitcoin Cash",     price: 487.30,   change: 2.34,  marketCap:    9600000000, volume:   480000000, high24h:   498.00, low24h:   472.00 },
  { id: "toncoin",       symbol: "TON", name: "Toncoin",          price: 6.23,     change: 1.87,  marketCap:   21000000000, volume:   380000000, high24h:     6.45, low24h:     6.05 },
  { id: "tron",          symbol: "TRX", name: "TRON",             price: 0.1245,   change: 0.98,  marketCap:   11000000000, volume:   420000000, high24h:     0.13, low24h:     0.12 },
  { id: "stellar",       symbol: "XLM", name: "Stellar",          price: 0.1234,   change: 1.23,  marketCap:    3600000000, volume:   145000000, high24h:     0.13, low24h:     0.12 },
  { id: "algorand",      symbol: "ALGO",name: "Algorand",         price: 0.2134,   change: -1.45, marketCap:    1740000000, volume:    78000000, high24h:     0.22, low24h:     0.20 },
  { id: "ethereum-classic",symbol:"ETC",name: "Ethereum Classic",  price: 27.80,   change: 0.45,  marketCap:    4000000000, volume:   185000000, high24h:    28.40, low24h:    27.20 },
  { id: "filecoin",      symbol: "FIL", name: "Filecoin",         price: 5.67,     change: 2.12,  marketCap:    2900000000, volume:   125000000, high24h:     5.84, low24h:     5.52 },
  { id: "aave",          symbol: "AAVE",name: "Aave",             price: 187.40,   change: 3.21,  marketCap:    2780000000, volume:   148000000, high24h:   192.00, low24h:   181.00 },
  { id: "usd-coin",      symbol: "USDC",name: "USD Coin",         price: 1.0001,   change: 0.01,  marketCap:   32000000000, volume:  5200000000, high24h:     1.001, low24h:     1.000 },
  { id: "flow",          symbol: "FLOW",name: "Flow",             price: 0.8723,   change: 1.34,  marketCap:    1250000000, volume:    45000000, high24h:     0.90, low24h:     0.84 },
  { id: "eos",           symbol: "EOS", name: "EOS",              price: 0.9234,   change: -0.67, marketCap:    1050000000, volume:    62000000, high24h:     0.96, low24h:     0.90 },
  { id: "internet-computer",symbol:"ICP",name:"Internet Computer", price: 12.34,   change: 2.56,  marketCap:    5780000000, volume:   234000000, high24h:    12.80, low24h:    11.90 },
  { id: "theta-network", symbol: "THETA",name:"THETA",            price: 1.432,    change: 1.12,  marketCap:    1430000000, volume:    52000000, high24h:     1.48, low24h:     1.39 },
];

const COIN_ICONS: Record<string, string> = {
  bitcoin: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ethereum: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  binancecoin: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  solana: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  cardano: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
  ripple: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  dogecoin: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
  polkadot: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
  litecoin: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
  "avalanche-2": "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
  "matic-network": "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
  chainlink: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  "shiba-inu": "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
  uniswap: "https://assets.coingecko.com/coins/images/12504/large/uni.jpg",
  cosmos: "https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png",
  "bitcoin-cash": "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png",
  toncoin: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
  tron: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
  stellar: "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png",
  algorand: "https://assets.coingecko.com/coins/images/4380/large/download.png",
  "ethereum-classic": "https://assets.coingecko.com/coins/images/453/large/ethereum-classic-logo.png",
  filecoin: "https://assets.coingecko.com/coins/images/12817/large/filecoin.png",
  aave: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
  "usd-coin": "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
  flow: "https://assets.coingecko.com/coins/images/13446/large/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png",
  eos: "https://assets.coingecko.com/coins/images/738/large/eos-eos-logo.png",
  "internet-computer": "https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png",
  "theta-network": "https://assets.coingecko.com/coins/images/2538/large/theta-token-logo.png",
};

// ID → symbol reverse lookup
const COINGECKO_ID_TO_SYMBOL: Record<string, string> = Object.entries(SYMBOL_TO_COINGECKO_ID).reduce(
  (acc, [sym, id]) => ({ ...acc, [id]: sym }),
  {} as Record<string, string>
);

// --- Fetch market data from CoinGecko ---
async function fetchCoinGeckoMarkets(): Promise<any[]> {
  const cached = getCache<any[]>("markets");
  if (cached) return cached;

  const ids = TOP_COIN_IDS.join(",");
  const data = await coingeckoFetch(
    `/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`
  );
  setCache("markets", data, 30_000); // 30s cache
  return data;
}

// --- Routes ---

router.get("/crypto/prices", async (_req, res): Promise<void> => {
  let coins: any[] = [];
  let fromCache = false;

  try {
    coins = await fetchCoinGeckoMarkets();
  } catch (err) {
    console.warn("CoinGecko unavailable, using fallback data:", (err as Error).message);
    coins = FALLBACK_COINS;
    fromCache = true;
  }

  const prices = coins.map((coin: any) => {
    const id = coin.id ?? "";
    const symbol = (coin.symbol ?? COINGECKO_ID_TO_SYMBOL[id] ?? id).toUpperCase();
    return {
      symbol: `${symbol}/USDT`,
      name: coin.name ?? symbol,
      price: coin.current_price ?? coin.price ?? 0,
      change: coin.price_change_percentage_24h ?? coin.change ?? 0,
      iconUrl: coin.image ?? COIN_ICONS[id] ?? null,
      marketCap: coin.market_cap ?? coin.marketCap ?? null,
      volume: coin.total_volume ?? coin.volume ?? null,
      high24h: coin.high_24h ?? coin.high24h ?? null,
      low24h: coin.low_24h ?? coin.low24h ?? null,
      sparkline: coin.sparkline_in_7d?.price ?? null,
    };
  });

  const response = GetCryptoPricesResponse.parse(prices);
  res.json(response);
});

router.get("/crypto/chart/:coinId", async (req, res): Promise<void> => {
  const { coinId } = req.params;
  const days = String(req.query.days ?? "1");
  const cacheKey = `chart:${coinId}:${days}`;

  const cached = getCache<any[]>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const data = await coingeckoFetch(
      `/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`
    );

    const points = (data.prices ?? []).map(([time, price]: [number, number]) => ({
      time,
      price,
    }));

    // Cache: 2 min for 1D, 10 min for longer ranges
    const ttl = days === "1" ? 120_000 : 600_000;
    setCache(cacheKey, points, ttl);

    const response = GetCoinChartResponse.parse(points);
    res.json(response);
  } catch (err) {
    console.warn("CoinGecko chart unavailable:", (err as Error).message);
    // Return synthetic fallback chart data
    const fallback = FALLBACK_COINS.find(
      (c) =>
        c.id === coinId ||
        c.symbol === coinId.toUpperCase() ||
        SYMBOL_TO_COINGECKO_ID[coinId.toUpperCase()] === c.id
    );
    const basePrice = fallback?.price ?? 1000;
    const now = Date.now();
    const hours = parseInt(days) * 24;
    const points = [];
    let p = basePrice * 0.97;
    for (let i = hours; i >= 0; i--) {
      p = p * (1 + (Math.random() - 0.48) * 0.015);
      points.push({ time: now - i * 3600_000, price: parseFloat(p.toFixed(8)) });
    }
    res.json(points);
  }
});

router.get("/crypto/ticker", async (_req, res): Promise<void> => {
  let tickerCoins: any[] = [];

  try {
    const markets = await fetchCoinGeckoMarkets();
    const wantedIds = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple"];
    tickerCoins = markets.filter((c: any) => wantedIds.includes(c.id)).slice(0, 5);
  } catch {
    tickerCoins = [];
  }

  const ticker = tickerCoins.length > 0
    ? tickerCoins.map((c: any) => ({
        pair: `${(c.symbol ?? "").toUpperCase()}/USDT`,
        price: c.current_price ?? 0,
        change: c.price_change_percentage_24h ?? 0,
      }))
    : [
        { pair: "BTC/USDT", price: 67234.50, change: 2.16 },
        { pair: "ETH/USDT", price: 3542.20,  change: 3.12 },
        { pair: "SOL/USDT", price: 182.60,   change: 4.87 },
        { pair: "BNB/USDT", price: 587.40,   change: 1.28 },
        { pair: "XRP/USDT", price: 0.6123,   change: 1.34 },
      ];

  const response = GetMarketTickerResponse.parse(ticker);
  res.json(response);
});

router.get("/crypto/ohlc/:coinId", async (req, res): Promise<void> => {
  const { coinId } = req.params;
  const { days = "1" } = req.query;
  const cacheKey = `ohlc:${coinId}:${days}`;

  const cached = getCache<any[]>(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const raw = await coingeckoFetch(
      `/coins/${encodeURIComponent(coinId)}/ohlc?vs_currency=usd&days=${days}`
    );
    const candles = (raw as [number, number, number, number, number][]).map(
      ([time, open, high, low, close]) => ({
        time: Math.floor(time / 1000),
        open, high, low, close,
      })
    );
    const ttl = String(days) === "1" ? 120_000 : 600_000;
    setCache(cacheKey, candles, ttl);
    res.json(candles);
  } catch {
    const fallback = FALLBACK_COINS.find((c) => c.id === coinId);
    const basePrice = fallback?.price ?? 1000;
    const daysNum = Math.max(1, parseFloat(String(days)));
    const pointsPerDay = daysNum <= 1 ? 48 : daysNum <= 7 ? 24 : daysNum <= 30 ? 6 : 1;
    const interval = Math.floor(86400 / pointsPerDay);
    const totalPoints = Math.min(500, Math.floor(daysNum * pointsPerDay));
    const now = Math.floor(Date.now() / 1000);
    const candles = [];
    let price = basePrice * 0.95;
    for (let i = totalPoints; i >= 0; i--) {
      const open = price;
      const change = price * (Math.random() - 0.47) * 0.025;
      const close = Math.max(0.0001, open + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.008);
      const low = Math.min(open, close) * (1 - Math.random() * 0.008);
      candles.push({ time: now - i * interval, open, high, low, close });
      price = close;
    }
    res.json(candles);
  }
});

// --- Export getCurrentPrice for use in orders route ---
export async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const markets = await fetchCoinGeckoMarkets();
    const sym = symbol.replace("/USDT", "").toUpperCase();
    const geckoId = SYMBOL_TO_COINGECKO_ID[sym];
    const coin = markets.find((c: any) => c.id === geckoId || (c.symbol ?? "").toUpperCase() === sym);
    if (coin?.current_price) return coin.current_price;
  } catch {
    // fall through to fallback
  }
  const sym = symbol.replace("/USDT", "").toUpperCase();
  const fallback = FALLBACK_COINS.find((c) => c.symbol === sym);
  return fallback?.price ?? 1;
}

export default router;
