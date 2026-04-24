import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { removeToken } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Menu, X, Bot, TrendingUp, Wallet, PieChart, CreditCard, User, BarChart2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const logoSrc = `${BASE}/logo.png`;

export function Header() {
  const { data: user } = useGetMe({ query: { retry: false } });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        removeToken();
        queryClient.setQueryData(getGetMeQueryKey(), null);
        navigate("/login");
        setMobileOpen(false);
      },
    });
  };

  const navLink = (href: string, label: string, icon?: React.ReactNode) => (
    <Link
      to={href}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${pathname === href ? "text-foreground font-semibold" : "text-foreground/60"}`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-screen-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoSrc} alt="PexCoin" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-bold text-lg tracking-tight text-primary">PEXCOIN</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          {navLink("/", "Markets", <TrendingUp className="h-3.5 w-3.5" />)}
          {user && navLink("/trade", "Trade", <BarChart2 className="h-3.5 w-3.5" />)}
          {user && navLink("/portfolio", "Portfolio", <PieChart className="h-3.5 w-3.5" />)}
          {user && navLink("/buy-crypto", "Buy Crypto", <CreditCard className="h-3.5 w-3.5" />)}
          {user && navLink("/deposit", "Deposit", <Wallet className="h-3.5 w-3.5" />)}
          {user && navLink("/ai-assistant", "AI Assistant", <Bot className="h-3.5 w-3.5" />)}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <User className="h-3.5 w-3.5" />
                  {user.name?.split(" ")[0] ?? user.email?.split("@")[0]}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link to="/register"><Button size="sm">Register</Button></Link>
            </>
          )}
        </div>

        {/* Mobile: show auth buttons if not logged in, or nothing (bottom nav handles it) */}
        {!user ? (
          <button
            className="md:hidden p-2 rounded-md text-foreground/60 hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        ) : (
          <div className="md:hidden flex items-center gap-2">
            <Link to="/profile">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{user.name?.[0]?.toUpperCase() ?? "U"}</span>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile dropdown (only for non-logged-in users) */}
      {!user && mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/98 px-4 py-4 flex flex-col gap-1 text-sm font-medium">
          {[
            { to: "/", label: "Markets", icon: <TrendingUp className="h-4 w-4" /> },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors py-2.5 border-b border-border/30 last:border-0"
            >
              {item.icon} {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-3">
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Login</Button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full">Register</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
