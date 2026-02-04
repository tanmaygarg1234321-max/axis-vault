import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";
import { Shield, Package, Clock, CreditCard, User, MessageCircle, Gift, ArrowLeft, Loader2, LogIn, Crown, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Checkout = () => {
  const navigate = useNavigate();
  const { getSelectedItems, getSelectedTotal, clearCart, getProductName, getProduct } = useCart();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [minecraftUsername, setMinecraftUsername] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftTo, setGiftTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const selectedItems = getSelectedItems();
  const cartTotal = getSelectedTotal();

  // Check auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Calculate final price with coupon
  const calculateFinalPrice = () => {
    if (!appliedCoupon) return cartTotal;
    if (appliedCoupon.type === "flat") {
      return Math.max(0, cartTotal - appliedCoupon.value);
    } else {
      return Math.round(cartTotal * (1 - appliedCoupon.value / 100));
    }
  };

  const finalPrice = calculateFinalPrice();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Invalid or expired coupon code");
        return;
      }

      if (data.max_uses && data.uses_count >= data.max_uses) {
        toast.error("This coupon has reached its usage limit");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("This coupon has expired");
        return;
      }

      setAppliedCoupon(data);
      toast.success("Coupon applied successfully!");
    } catch (err) {
      toast.error("Failed to apply coupon");
    }
  };

  const handlePayment = async () => {
    if (!minecraftUsername.trim()) {
      toast.error("Please enter your Minecraft username");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("No items selected for checkout");
      return;
    }

    setLoading(true);

    try {
      // Build cart items for order (include amountInt for money packages)
      const cartItemsForOrder = selectedItems.map(item => {
        const product = getProduct(item.type, item.productId);
        const baseItem = {
          type: item.type,
          productId: item.productId,
          quantity: item.quantity,
          name: getProductName(item.type, item.productId),
        };
        
        // Include amountInt for money packages
        if (item.type === "money" && product && "amountInt" in product) {
          return { ...baseItem, amountInt: product.amountInt };
        }
        return baseItem;
      });

      // Create order via edge function
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          cartItems: cartItemsForOrder,
          amount: finalPrice,
          minecraftUsername: minecraftUsername.trim(),
          discordUsername: discordUsername.trim() || "Not provided",
          giftTo: isGift ? giftTo.trim() : null,
          couponId: appliedCoupon?.id || null,
          userId: user?.id || null,
          userEmail: user?.email || null,
        },
      });

      if (error) throw error;

      const { razorpayOrderId, orderId, razorpayKeyId } = data;

      // Build product name for Razorpay
      const productDescription = selectedItems.length === 1
        ? getProductName(selectedItems[0].type, selectedItems[0].productId)
        : `${selectedItems.length} items from Axis Store`;

      // Open Razorpay checkout
      const options = {
        key: razorpayKeyId,
        amount: finalPrice * 100,
        currency: "INR",
        name: "Axis Economy Store",
        description: productDescription,
        order_id: razorpayOrderId,
        prefill: {
          name: minecraftUsername,
          email: user?.email || "",
        },
        handler: async function (response: any) {
          // Verify payment
          const { error: verifyError } = await supabase.functions.invoke("verify-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            },
          });

          if (verifyError) {
            navigate(`/payment-status?status=failed&order=${orderId}`);
          } else {
            // Clear cart on successful payment
            clearCart();
            navigate(`/payment-status?status=success&order=${orderId}`);
          }
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Failed to create order");
      setLoading(false);
    }
  };

  const getItemIcon = (type: string) => {
    if (type === "rank") return <Crown className="w-4 h-4 text-amber-400" />;
    if (type === "crate") return <Package className="w-4 h-4 text-blue-400" />;
    return <Coins className="w-4 h-4 text-yellow-400" />;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to cart if no items selected
  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-display text-2xl font-bold mb-4">No Items Selected</h1>
            <p className="text-muted-foreground mb-6">Please select items from your cart to checkout.</p>
            <Button asChild>
              <Link to="/cart">Go to Cart</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Require login for checkout
  if (!user) {
    return (
      <>
        <Helmet>
          <title>Checkout - Axis Economy Store</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-lg text-center">
              <div className="glass-card p-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <LogIn className="w-10 h-10 text-primary" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-4">Sign In to Continue</h1>
                <p className="text-muted-foreground mb-6">
                  Please sign in or create an account to complete your purchase.
                  This helps us track your orders and send you updates.
                </p>
                <div className="space-y-3">
                  <Button asChild variant="hero" className="w-full">
                    <Link to="/auth?redirect=/checkout">
                      <User className="w-4 h-4" />
                      Sign In / Create Account
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/cart">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Cart
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
  }

  return (
    <>
      <Helmet>
        <title>Checkout - Axis Economy Store</title>
        <meta name="description" content="Complete your purchase securely with Razorpay." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Back button */}
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </Link>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Order Summary */}
              <div className="glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Order Summary ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})
                </h2>

                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {selectedItems.map((item) => {
                    const name = getProductName(item.type, item.productId);
                    const product = getProduct(item.type, item.productId);
                    const price = product?.price ?? 0;
                    return (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          {getItemIcon(item.type)}
                          <div>
                            <p className="font-semibold text-foreground text-sm">{name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {item.type} {item.quantity > 1 && `× ${item.quantity}`}
                            </p>
                          </div>
                        </div>
                        <p className="font-display font-bold text-sm text-foreground">
                          {formatPrice(price * item.quantity)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-border">
                    <span className="text-primary">Coupon: {appliedCoupon.code}</span>
                    <span className="text-primary">
                      -{appliedCoupon.type === "flat"
                        ? formatPrice(appliedCoupon.value)
                        : `${appliedCoupon.value}%`}
                    </span>
                  </div>
                )}

                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="font-display font-bold text-xl text-primary">
                      {formatPrice(finalPrice)}
                    </span>
                  </div>
                </div>

                {/* Coupon section */}
                <div className="mt-6 pt-6 border-t border-border">
                  <Label className="text-sm font-medium mb-2 block">Have a coupon?</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="uppercase"
                      disabled={!!appliedCoupon}
                    />
                    <Button
                      variant="outline"
                      onClick={applyCoupon}
                      disabled={!!appliedCoupon}
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                {/* Info badges */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Instant delivery after payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Secure Razorpay payment</span>
                  </div>
                </div>
              </div>

              {/* Checkout Form */}
              <div className="glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Checkout
                </h2>

                <div className="space-y-5">
                  {/* Logged in as */}
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">Logged in as</p>
                    <p className="font-medium text-primary">{user.email}</p>
                  </div>

                  {/* Minecraft Username */}
                  <div className="space-y-2">
                    <Label htmlFor="minecraft" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Minecraft Username <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="minecraft"
                      placeholder="Enter your exact username"
                      value={minecraftUsername}
                      onChange={(e) => setMinecraftUsername(e.target.value)}
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Make sure this matches your in-game name exactly
                    </p>
                  </div>

                  {/* Discord Username (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="discord" className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Discord Username <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="discord"
                      placeholder="username#0000 or username"
                      value={discordUsername}
                      onChange={(e) => setDiscordUsername(e.target.value)}
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll contact you here if there are any issues
                    </p>
                  </div>

                  {/* Gift option */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gift"
                        checked={isGift}
                        onCheckedChange={(checked) => setIsGift(checked as boolean)}
                      />
                      <Label htmlFor="gift" className="flex items-center gap-2 cursor-pointer">
                        <Gift className="w-4 h-4 text-primary" />
                        This is a gift for someone else
                      </Label>
                    </div>

                    {isGift && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="giftTo">
                          Recipient's Minecraft Username <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="giftTo"
                          placeholder="Enter recipient's username"
                          value={giftTo}
                          onChange={(e) => setGiftTo(e.target.value)}
                          className="bg-muted/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment info */}
                  <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                    <p className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Payments are processed securely via Razorpay.
                    </p>
                    <p>We do not store your card or UPI details.</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="bg-muted px-2 py-1 rounded text-xs">UPI</span>
                      <span className="bg-muted px-2 py-1 rounded text-xs">Cards</span>
                      <span className="bg-muted px-2 py-1 rounded text-xs">Netbanking</span>
                      <span className="bg-muted px-2 py-1 rounded text-xs">Wallets</span>
                    </div>
                  </div>

                  {/* Pay button */}
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full"
                    onClick={handlePayment}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Pay Securely {formatPrice(finalPrice)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By completing this purchase, you agree to our{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms & Refund Policy
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Checkout;
