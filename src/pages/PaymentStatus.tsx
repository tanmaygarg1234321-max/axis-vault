import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MessageCircle, ShoppingBag, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const orderId = searchParams.get("order");

  const isSuccess = status === "success";

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
                  <p className="text-muted-foreground mb-6">
                    Your purchase has been confirmed.
                    <br />
                    Your items will be delivered shortly.
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
