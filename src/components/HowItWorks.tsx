import { Package, User, CreditCard, Gift } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Package,
      title: "Choose Your Item",
      description: "Browse ranks, crates, or money packages",
    },
    {
      icon: User,
      title: "Enter Username",
      description: "Provide your Minecraft & Discord username",
    },
    {
      icon: CreditCard,
      title: "Pay Securely",
      description: "Complete payment via Razorpay",
    },
    {
      icon: Gift,
      title: "Receive Items",
      description: "Items delivered automatically in-game",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            How It <span className="text-gradient-primary">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Simple, fast, and completely automated
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="glass-card p-6 text-center relative z-10 hover:border-primary/50 transition-colors">
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-sm font-bold">
                  {index + 1}
                </div>

                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
