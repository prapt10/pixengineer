import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useCurrency } from "@/hooks/useCurrency";
import darkLogo from "@/assets/dark-logo.webp";
import lightLogo from "@/assets/light-logo.webp";

const Footer = forwardRef<HTMLElement>(function Footer(_props, ref) {
  const { theme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const year = new Date().getFullYear();

  return (
    <footer ref={ref} className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container px-4 py-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={theme === "dark" ? darkLogo : lightLogo} alt="Pix Engineer" className="w-7 h-7" />
            <span className="font-semibold text-sm">Pix Engineer</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
            <Link to="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          </nav>
        </div>
        <div className="mt-6 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {year} Pix Engineer. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Currency:</span>
            <button
              onClick={() => setCurrency("INR")}
              className={`px-2.5 py-1 rounded-l-md border border-border transition-colors ${
                currency === "INR"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-2.5 py-1 rounded-r-md border border-border -ml-px transition-colors ${
                currency === "USD"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
