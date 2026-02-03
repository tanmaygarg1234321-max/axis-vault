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

      <div className="min-h-screen bg-background overflow-hidden">
        <Header />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          {/* Advanced background effects */}
          <div className="absolute inset-0">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/50" />
            
            {/* Animated grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-20" />
            
            {/* Radial gradient overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            
            {/* Floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[150px] animate-pulse" />
            
            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.015]" style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }} />
            
            {/* Diagonal lines */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 40px,
                hsl(var(--primary) / 0.1) 40px,
                hsl(var(--primary) / 0.1) 41px
              )`
            }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-5 py-2.5 mb-8 animate-fade-in backdrop-blur-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-primary tracking-wide">Official Axis SMP Store</span>
              </div>

              {/* Main heading */}
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up leading-tight">
                Upgrade Your
                <br />
                <span className="text-gradient-primary relative">
                  Minecraft Gameplay
                  <div className="absolute -inset-2 bg-primary/10 blur-2xl rounded-full -z-10" />
                </span>
                <br />
                <span className="text-foreground/90">Instantly</span>
              </h1>

              {/* Subheading */}
              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up delay-100 leading-relaxed">
                Buy ranks, crates, and in-game money for Axis SMP.
                <br className="hidden md:block" />
                <span className="text-foreground font-medium">Secure payments • Instant delivery • No manual work.</span>
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-200">
                <Button asChild variant="hero" size="xl" className="group relative overflow-hidden">
                  <Link to="/store">
                    <span className="relative z-10 flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Open Store
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </Button>
                <Button asChild variant="heroSecondary" size="xl" className="group backdrop-blur-sm">
                  <a href="https://discord.gg/f3NJw7ZJDw" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5" />
                    Join Discord
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </a>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-20 animate-slide-up delay-300">
                <p className="text-muted-foreground text-sm mb-6 uppercase tracking-widest">Trusted by players worldwide</p>
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {[
                    { icon: Shield, label: "Secure Payments", color: "text-emerald-400" },
                    { icon: Zap, label: "Instant Delivery", color: "text-yellow-400" },
                    { icon: Package, label: "Automated System", color: "text-blue-400" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-muted-foreground group">
                      <div className={`w-10 h-10 rounded-xl bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-6 h-10 border-2 border-muted-foreground/20 rounded-full flex justify-center pt-2 backdrop-blur-sm">
              <div className="w-1 h-3 bg-primary rounded-full animate-bounce" />
            </div>
          </div>
        </section>

        <TrustStrip />
        <HowItWorks />

        {/* Featured Products Preview */}
        <section className="py-24 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-card/50 to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                What We <span className="text-gradient-gold">Offer</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-lg">
                Everything you need to enhance your Axis SMP experience
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Ranks Card */}
              <Link
                to="/store?tab=ranks"
                className="glass-card p-8 text-center hover:border-primary/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg shadow-primary/20">
                    <Crown className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-3">Server Ranks</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    Unlock exclusive perks, commands, and cosmetics
                  </p>
                  <p className="text-primary font-display font-bold text-lg">From ₹105</p>
                </div>
              </Link>

              {/* Crates Card */}
              <Link
                to="/store?tab=crates"
                className="glass-card p-8 text-center hover:border-accent/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg shadow-accent/20">
                    <Package className="w-10 h-10 text-accent-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-3">Crate Keys</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    Random rewards, rare items, and exclusive loot
                  </p>
                  <p className="text-primary font-display font-bold text-lg">From ₹90</p>
                </div>
              </Link>

              {/* Money Card */}
              <Link
                to="/store?tab=money"
                className="glass-card p-8 text-center hover:border-secondary/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg shadow-secondary/20">
                    <Sparkles className="w-10 h-10 text-secondary-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-3">In-Game Money</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    Instant economy boost for your adventures
                  </p>
                  <p className="text-primary font-display font-bold text-lg">From ₹50</p>
                </div>
              </Link>
            </div>

            <div className="text-center mt-14">
              <Button asChild variant="hero" size="lg" className="group">
                <Link to="/store">
                  View All Products
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
