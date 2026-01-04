import { Shield, Zap, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TrustStrip = () => {
  const [purchaseCount, setPurchaseCount] = useState<number>(0);

  useEffect(() => {
    const fetchPurchaseCount = async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .or("payment_status.eq.paid,payment_status.eq.delivered");
      
      if (!error && count !== null) {
        // Add base number to show growth (you can adjust this)
        setPurchaseCount(count + 1200);
      } else {
        setPurchaseCount(1200);
      }
    };

    fetchPurchaseCount();
  }, []);

  const features = [
    { icon: Shield, label: "Secure Razorpay Payments" },
    { icon: Zap, label: "Instant Delivery" },
    { icon: RefreshCw, label: "Automated System" },
    { icon: Users, label: `${purchaseCount.toLocaleString()}+ Purchases` },
  ];

  return (
    <div className="bg-muted/30 border-y border-border/50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <feature.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustStrip;
