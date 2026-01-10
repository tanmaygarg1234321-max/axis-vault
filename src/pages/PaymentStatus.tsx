import { useSearchParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MessageCircle, ShoppingBag, Home, Clock, AlertCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const orderId = searchParams.get("order");
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [productType, setProductType] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);

  const isSuccess = status === "success";

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (orderId && isSuccess) {
        try {
          // Use secure RPC function to lookup order (no auth required, limited data returned)
          const { data } = await supabase.rpc('lookup_order_by_order_id', {
            p_order_id: orderId
          });
          
          if (data && data.length > 0) {
            const order = data[0];
            // The RPC only returns: id, order_id, payment_status, delivery_status, product_name, created_at
            // We can infer product type from product_name
            const productName = order.product_name?.toLowerCase() || '';
            let inferredType = 'rank';
            if (productName.includes('crate') || productName.includes('key')) {
              inferredType = 'crate';
            } else if (productName.includes('money') || productName.includes('₹') || productName.includes('$')) {
              inferredType = 'money';
            }
            
            setProductType(inferredType);
            setDeliveryStatus(order.delivery_status);

            // For ranks, default to 30 days (we can't access active_ranks without auth)
            if (inferredType === "rank") {
              setExpiryDays(30);
            }
          }
        } catch (err) {
          console.error("Error fetching order details:", err);
        }
      }
    };

    fetchOrderDetails();
  }, [orderId, isSuccess]);

  return (
    <>
      <Helmet>
        <title>{isSuccess ? "Payment Successful" : "Payment Failed"} - Axis Economy Store</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="glass-card p-8 text-center">
              {isSuccess ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="font-display text-3xl font-bold mb-4 text-primary">
                    Payment Successful! 🎉
                  </h1>
                  <p className="text-muted-foreground mb-4">
                    Your purchase has been confirmed.
                  </p>
                  
                  {/* Delivery Status */}
                  <div className="bg-muted/30 rounded-xl p-4 mb-6 text-left space-y-3">
                    <div className="flex items-start gap-3">
                      {deliveryStatus === "delivered" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">
                          {deliveryStatus === "delivered" 
                            ? "Your item has been delivered!" 
                            : "Your item is being processed..."}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {productType === "rank" && "Your rank has been applied to your account."}
                          {productType === "money" && "Your in-game money has been added."}
                          {productType === "crate" && "Your crate has been added to your account."}
                        </p>
                      </div>
                    </div>

                    {/* Relog Notice */}
                    <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                      <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-blue-400">Don't see your item?</p>
                        <p className="text-sm text-muted-foreground">
                          Relog from the server to see your purchase. If it still doesn't appear after 5 minutes, contact support.
                        </p>
                      </div>
                    </div>

                    {/* Rank Expiry Countdown */}
                    {productType === "rank" && expiryDays !== null && (
                      <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                        <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Rank Duration</p>
                          <p className="text-sm text-muted-foreground">
                            Your rank expires in <span className="font-bold text-primary">{expiryDays} days</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {orderId && (
                    <p className="text-sm text-muted-foreground mb-6 bg-muted/50 rounded-lg p-3">
                      Order ID: <span className="font-mono text-foreground">{orderId}</span>
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild variant="hero">
                      <Link to="/store">
                        <ShoppingBag className="w-4 h-4" />
                        Continue Shopping
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="https://discord.gg/f3NJw7ZJDw" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4" />
                        Join Discord
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <h1 className="font-display text-3xl font-bold mb-4 text-destructive">
                    Payment Failed
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    No money was deducted from your account.
                    <br />
                    Please try again or contact support.
                  </p>
                  {orderId && (
                    <p className="text-sm text-muted-foreground mb-6 bg-muted/50 rounded-lg p-3">
                      Order ID: <span className="font-mono text-foreground">{orderId}</span>
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild variant="hero">
                      <Link to="/store">
                        <ShoppingBag className="w-4 h-4" />
                        Try Again
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="https://discord.gg/f3NJw7ZJDw" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4" />
                        Get Support
                      </a>
                    </Button>
                  </div>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-border">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/">
                    <Home className="w-4 h-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PaymentStatus;
