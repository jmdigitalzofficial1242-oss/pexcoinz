import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth-utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PaymentPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PaymentPasswordModal({ open, onClose, onSuccess, title = "Payment Password", description = "Enter your 6-digit payment password to continue." }: PaymentPasswordModalProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pin];
    next[idx] = val.slice(-1);
    setPin(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const password = pin.join("");
    if (password.length !== 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/user/payment-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        onSuccess();
        setPin(["", "", "", "", "", ""]);
        onClose();
      } else {
        toast({ title: "Incorrect payment password", variant: "destructive" });
        setPin(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
      }
    } catch {
      toast({ title: "Error verifying password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin(["", "", "", "", "", ""]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-2 justify-center">
            {pin.map((digit, idx) => (
              <Input
                key={idx}
                ref={(el) => { refs.current[idx] = el; }}
                type={show ? "text" : "password"}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-12 text-center text-lg font-bold font-mono p-0"
                autoFocus={idx === 0}
              />
            ))}
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || pin.join("").length !== 6}>
              {loading ? "Verifying..." : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SetPaymentPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetPaymentPasswordModal({ open, onClose, onSuccess }: SetPaymentPasswordModalProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"set" | "confirm">("set");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  const handleChange = (idx: number, val: string, isConfirm: boolean) => {
    if (!/^\d*$/.test(val)) return;
    if (isConfirm) {
      const next = [...confirmPin]; next[idx] = val.slice(-1); setConfirmPin(next);
      if (val && idx < 5) confirmRefs.current[idx + 1]?.focus();
    } else {
      const next = [...pin]; next[idx] = val.slice(-1); setPin(next);
      if (val && idx < 5) refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm: boolean) => {
    if (e.key === "Backspace") {
      if (isConfirm && !confirmPin[idx] && idx > 0) confirmRefs.current[idx - 1]?.focus();
      if (!isConfirm && !pin[idx] && idx > 0) refs.current[idx - 1]?.focus();
    }
  };

  const handleNext = () => {
    if (pin.join("").length !== 6) { toast({ title: "Enter all 6 digits", variant: "destructive" }); return; }
    setStep("confirm");
    setTimeout(() => confirmRefs.current[0]?.focus(), 100);
  };

  const handleSubmit = async () => {
    const password = pin.join("");
    const confirm = confirmPin.join("");
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      setConfirmPin(["", "", "", "", "", ""]);
      confirmRefs.current[0]?.focus();
      return;
    }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/user/payment-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        toast({ title: "Payment password set successfully!" });
        onSuccess();
        handleClose();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to set password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error setting password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin(["", "", "", "", "", ""]); setConfirmPin(["", "", "", "", "", ""]);
    setStep("set"); onClose();
  };

  const currentPin = step === "set" ? pin : confirmPin;
  const currentRefs = step === "set" ? refs : confirmRefs;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Set Payment Password
          </DialogTitle>
          <DialogDescription>
            {step === "set" ? "Create a 6-digit payment password to secure your transactions." : "Re-enter your payment password to confirm."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-2 justify-center">
            {currentPin.map((digit, idx) => (
              <Input
                key={idx}
                ref={(el) => { currentRefs.current[idx] = el; }}
                type={show ? "text" : "password"}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value, step === "confirm")}
                onKeyDown={(e) => handleKeyDown(idx, e, step === "confirm")}
                className="w-11 h-12 text-center text-lg font-bold font-mono p-0"
                autoFocus={idx === 0}
              />
            ))}
            <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => setShow(!show)}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={step === "confirm" ? () => setStep("set") : handleClose}>
              {step === "confirm" ? "Back" : "Cancel"}
            </Button>
            {step === "set" ? (
              <Button className="flex-1" onClick={handleNext} disabled={pin.join("").length !== 6}>Next</Button>
            ) : (
              <Button className="flex-1" onClick={handleSubmit} disabled={loading || confirmPin.join("").length !== 6}>
                {loading ? "Saving..." : "Set Password"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
