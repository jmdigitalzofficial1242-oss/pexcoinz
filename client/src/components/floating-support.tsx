import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

export function FloatingSupport() {
  return (
    <Link
      to="/support"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      title="Customer Support"
    >
      <MessageCircle className="h-5 w-5" />
    </Link>
  );
}
