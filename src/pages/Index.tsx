import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustStrip from "@/components/TrustStrip";
import HowItWorks from "@/components/HowItWorks";
import { Crown, Sparkles, MessageCircle, ChevronRight, Shield, Zap, Package } from "lucide-react";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Axis Economy Store - Minecraft Server Store</title>
        <meta name="description" content="Buy ranks, crates, and in-game money for Axis SMP. Secure payments, instant delivery, fully automated." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          {/* Background effects */}
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-8 animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Official Axis SMP Store</span>
              </div>

              {/* Main heading */}
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
                Upgrade Your
                <br />
                <span className="text-gradient-primary">Minecraft Gameplay</span>
                <br />
                Instantly
              </h1>

              {/* Subheading */}
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up delay-100">
                Buy ranks, crates, and in-game money for Axis SMP.
                <br className="hidden md:block" />
                <span className="text-foreground">Secure payments • Instant delivery • No manual work.</span>
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-200">
                <Button asChild variant="hero" size="xl">
                  <Link to="/store">
                    <Crown className="w-5 h-5" />
                    Open Store
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="heroSecondary" size="xl">
                  <a href="https://discord.gg/f3NJw7ZJDw" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5" />
                    Join Discord
                  </a>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-16 animate-slide-up delay-300">
                <p className="text-muted-foreground text-sm mb-4">Trusted by players worldwide</p>
                <div className="flex flex-wrap justify-center gap-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-sm">Secure Payments</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="text-sm">Instant Delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-sm">Automated System</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        <TrustStrip />
        <HowItWorks />

        {/* Featured Products Preview */}
        <section className="py-20 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                What We <span className="text-gradient-gold">Offer</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Everything you need to enhance your Axis SMP experience
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Ranks Card */}
              <Link
                to="/store?tab=ranks"
                className="glass-card p-6 text-center hover:border-primary/50 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Crown className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">Server Ranks</h3>
                <p className="text-muted-foreground text-sm">
                  Unlock exclusive perks, commands, and cosmetics
                </p>
                <p className="text-primary font-semibold mt-3 text-sm">From ₹105</p>
              </Link>

              {/* Crates Card */}
              <Link
                to="/store?tab=crates"
                className="glass-card p-6 text-center hover:border-primary/50 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8 text-accent-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">Crate Keys</h3>
                <p className="text-muted-foreground text-sm">
                  Random rewards, rare items, and exclusive loot
                </p>
                <p className="text-primary font-semibold mt-3 text-sm">From ₹90</p>
              </Link>

              {/* Money Card */}
              <Link
                to="/store?tab=money"
                className="glass-card p-6 text-center hover:border-primary/50 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-secondary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">In-Game Money</h3>
                <p className="text-muted-foreground text-sm">
                  Instant economy boost for your adventures
                </p>
                <p className="text-primary font-semibold mt-3 text-sm">From ₹32</p>
              </Link>
            </div>

            <div className="text-center mt-10">
              <Button asChild variant="hero" size="lg">
                <Link to="/store">
                  View All Products
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Index;
