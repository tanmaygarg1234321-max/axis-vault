import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Menu, X, User, ShoppingBag, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/store", label: "Store" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg group-hover:shadow-primary/40 transition-shadow">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-wider text-foreground">
              AXIS <span className="text-primary">ECO</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-display text-sm tracking-wide uppercase transition-colors ${
                  isActive(link.to)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://discord.gg/f3NJw7ZJDw"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              Discord
            </a>
          </nav>

          {/* CTA + User Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    {user.email?.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/purchases" className="flex items-center gap-2 cursor-pointer">
                      <ShoppingBag className="w-4 h-4" />
                      My Purchases
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-red-400">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
            <Button asChild variant="hero" size="sm">
              <Link to="/store">Open Store</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-display text-sm tracking-wide uppercase transition-colors ${
                    isActive(link.to)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://discord.gg/f3NJw7ZJDw"
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Discord
              </a>
              {user ? (
                <>
                  <Link
                    to="/purchases"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-display text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    My Purchases
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="font-display text-sm tracking-wide uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </Link>
              )}
              <Button asChild variant="hero" size="sm" className="w-fit">
                <Link to="/store" onClick={() => setMobileMenuOpen(false)}>Open Store</Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
