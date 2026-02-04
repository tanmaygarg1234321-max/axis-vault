import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { formatPrice } from "@/lib/products";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  User,
  ShoppingBag,
  Loader2,
  Crown,
  Coins,
  LogIn,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CartItem {
  type: string;
  productId: string;
  quantity: number;
  name: string;
}

interface Order {
  id: string;
  order_id: string;
  product_name: string;
  product_type: string;
  amount: number;
  payment_status: string;
  delivery_status: string;
  minecraft_username: string;
  gift_to: string | null;
  created_at: string;
  error_log: string | null;
}

const PurchaseHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrders(session.user.id);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrders(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
    setLoading(false);
  };

  const parseCartItems = (order: Order): CartItem[] | null => {
    try {
      if (order.error_log && order.error_log.startsWith('{')) {
        const parsed = JSON.parse(order.error_log);
        if (parsed.cartItems && Array.isArray(parsed.cartItems)) {
          return parsed.cartItems;
        }
      }
    } catch (e) {
      // Not JSON, return null
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: (
        <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <Clock className="w-3 h-3" /> Pending
        </span>
      ),
      paid: (
        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <CreditCard className="w-3 h-3" /> Paid
        </span>
      ),
      delivered: (
        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" /> Delivered
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      ),
    };
    return badges[status] || <span className="text-xs text-muted-foreground">{status}</span>;
  };

  const getProductIcon = (type: string) => {
    switch (type) {
      case "rank":
        return <Crown className="w-5 h-5 text-primary" />;
      case "crate":
        return <Package className="w-5 h-5 text-purple-400" />;
      case "money":
        return <Coins className="w-5 h-5 text-yellow-400" />;
      default:
        return <ShoppingBag className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "rank":
        return <Crown className="w-4 h-4 text-amber-400" />;
      case "crate":
        return <Package className="w-4 h-4 text-purple-400" />;
      case "money":
        return <Coins className="w-4 h-4 text-yellow-400" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Purchase History - Axis Economy Store</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-lg text-center">
              <Card className="bg-card/50 backdrop-blur">
                <CardContent className="pt-12 pb-8">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                    <LogIn className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="font-display text-2xl font-bold mb-4">Sign In Required</h1>
                  <p className="text-muted-foreground mb-6">
                    Please sign in to view your purchase history
                  </p>
                  <Button asChild variant="hero">
                    <Link to="/auth">
                      <User className="w-4 h-4" />
                      Sign In
                    </Link>
                  </Button>
                </CardContent>
              </Card>
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
        <title>Purchase History - Axis Economy Store</title>
        <meta name="description" content="View your purchase history and order status" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="font-display text-4xl font-bold mb-4">
                <span className="text-gradient-primary">Purchase History</span>
              </h1>
              <p className="text-muted-foreground">
                View all your past orders and their status
              </p>
            </div>

            {orders.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur text-center">
                <CardContent className="pt-12 pb-8">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
                  <h2 className="font-display text-xl font-bold mb-2">No purchases yet</h2>
                  <p className="text-muted-foreground mb-6">
                    You haven't made any purchases. Check out our store!
                  </p>
                  <Button asChild variant="hero">
                    <Link to="/store">
                      <ShoppingBag className="w-4 h-4" />
                      Browse Store
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const cartItems = parseCartItems(order);
                  const isBundle = cartItems && cartItems.length > 1;
                  const isExpanded = expandedOrder === order.id;
                  
                  return (
                    <Card key={order.id} className="bg-card/50 backdrop-blur hover:bg-card/70 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              {isBundle ? (
                                <ShoppingBag className="w-6 h-6 text-primary" />
                              ) : (
                                getProductIcon(order.product_type)
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{order.product_name}</h3>
                                {isBundle && (
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                    {cartItems.length} items
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Order: <span className="font-mono">{order.order_id}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Player: {order.gift_to || order.minecraft_username}
                                {order.gift_to && (
                                  <span className="text-primary ml-1">(Gift)</span>
                                )}
                              </p>
                              
                              {/* Expandable items list for bundles */}
                              {isBundle && (
                                <button
                                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                  className="flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Hide items
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      View items
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end gap-2">
                            <p className="font-display font-bold text-xl text-primary">
                              {formatPrice(order.amount)}
                            </p>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(order.payment_status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Expanded items list */}
                        {isBundle && isExpanded && cartItems && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-sm font-medium mb-3 text-muted-foreground">Items in this order:</p>
                            <div className="space-y-2">
                              {cartItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm bg-muted/30 rounded-lg px-3 py-2">
                                  {getItemIcon(item.type)}
                                  <span className="flex-1">{item.name}</span>
                                  {item.quantity > 1 && (
                                    <span className="text-muted-foreground">×{item.quantity}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PurchaseHistory;
