import { Link, useLocation } from "react-router-dom";
import { Home, BarChart2, Bot, PieChart, User, Headphones } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/trade", label: "Trade", icon: BarChart2 },
  { to: "/ai-assistant", label: "AI", icon: Bot },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/support", label: "Support", icon: Headphones },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/98 backdrop-blur-md safe-bottom">
      <div className="grid grid-cols-6 h-16">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[9px] font-medium ${isActive ? "font-semibold" : ""}`}>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
