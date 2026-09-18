import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sun, Moon, LogOut, Coins, LayoutDashboard, Shield, Wand2, Code2, Menu, X, Rocket, Zap, MessageSquare, User } from "lucide-react";
import darkLogo from "@/assets/dark-logo.webp";
import lightLogo from "@/assets/light-logo.webp";

export default function Header() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalCredits = (profile?.credit_balance ?? 0);

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive(path)
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`;

  const closeMobile = () => setMobileOpen(false);

  const NavItems = () => (
    <>
      <Link to="/" className={navLinkClass("/")} onClick={closeMobile}>
        <Rocket className="w-4 h-4" />
        <span>Build App</span>
      </Link>
      <Link to="/design-to-code" className={navLinkClass("/design-to-code")} onClick={closeMobile}>
        <Code2 className="w-4 h-4" />
        <span>Design to Code</span>
      </Link>
      <Link to="/prompt-engineer" className={navLinkClass("/prompt-engineer")} onClick={closeMobile}>
        <Wand2 className="w-4 h-4" />
        <span>Prompt Engineer</span>
      </Link>
      <Link to="/chat" className={navLinkClass("/chat")} onClick={closeMobile}>
        <MessageSquare className="w-4 h-4" />
        <span>Pix Chat</span>
      </Link>
      {user && (
        <>
          <Link to="/dashboard" className={navLinkClass("/dashboard")} onClick={closeMobile}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link to="/pricing" className={navLinkClass("/pricing")} onClick={closeMobile}>
            {totalCredits > 0 ? (
              <>
                <Coins className="w-4 h-4" />
                <span>{totalCredits}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">FREE</span>
              </>
            )}
          </Link>
          {isAdmin && (
            <Link to="/admin" className={navLinkClass("/admin")} onClick={closeMobile}>
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src={theme === "dark" ? darkLogo : lightLogo} alt="Pix Engineer" className="w-8 h-8" />
          <span className="font-semibold text-base">Pix Engineer</span>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav className="flex items-center gap-1">
            <NavItems />
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="h-8 w-8" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {user ? (
            <>
              <Link to="/profile" aria-label="Profile settings">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" aria-label="Sign out" className="h-8 w-8" onClick={() => { signOut(); navigate("/"); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" className="h-8 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs">
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <Button variant="ghost" size="icon" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} className="h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div className="glass border-t border-border/50 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
          <NavItems />
        </div>
      )}
    </header>
  );
}
