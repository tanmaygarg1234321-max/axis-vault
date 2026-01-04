import { Link } from "react-router-dom";
import { Crown, MessageCircle, Mail, FileText } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card/50 border-t border-border/50 py-12 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl tracking-wider">
                AXIS <span className="text-primary">ECO</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The official store for Axis SMP. Buy ranks, crates, and in-game money securely.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Home
              </Link>
              <Link to="/store" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Store
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Terms & Refund Policy
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground">
              Support
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://discord.gg/f3NJw7ZJDw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Discord Server
              </a>
              <a
                href="mailto:axiseconomy@gmail.com"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                axiseconomy@gmail.com
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground">
              Legal
            </h4>
            <div className="flex flex-col gap-3">
              <Link
                to="/terms"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Terms of Service
              </Link>
              <Link
                to="/terms"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Refund Policy
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Axis Economy Store. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Payments secured by Razorpay
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
