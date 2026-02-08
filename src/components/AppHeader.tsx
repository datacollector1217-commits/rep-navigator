import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ekwayLogo from "@/assets/ekway-logo.png";

export default function AppHeader() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="gradient-navy text-primary-foreground px-4 py-3 shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={ekwayLogo} alt="Ekway Lanka Logo" className="h-10 w-10 rounded-lg object-contain bg-white/90 p-0.5" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight leading-none">EKWAY LANKA</h1>
            <p className="text-[10px] tracking-widest uppercase opacity-70">Vehicle Itinerary System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-3 py-1.5">
            {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            <span className="text-xs font-semibold">{profile?.full_name || "User"}</span>
            <span className="text-[10px] uppercase bg-primary-foreground/20 rounded px-1.5 py-0.5 font-bold">
              {role || "—"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
