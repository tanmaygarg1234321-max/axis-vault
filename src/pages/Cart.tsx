import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useCart, CartItem } from "@/contexts/CartContext";
import { formatPrice, ranks, crates, moneyPackages } from "@/lib/products";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Bookmark,
  ArrowRight,
  Crown,
  Package,
  Coins,
  ArrowLeft,
  ShoppingBag,
  BookmarkCheck,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CartItemCard = ({ item }: { item: CartItem }) => {
  const { removeFromCart, updateQuantity, toggleSelection, saveForLater, getProductName, getProductPrice, getProduct } = useCart();
  
  const product = getProduct(item.type, item.productId);
  const name = getProductName(item.type, item.productId);
  const price = getProductPrice(item.type, item.productId);
  const isRank = item.type === "rank";
  
  const getIcon = () => {
    if (item.type === "rank") return <Crown className="w-5 h-5 text-amber-400" />;
    if (item.type === "crate") return <Package className="w-5 h-5 text-blue-400" />;
    return <Coins className="w-5 h-5 text-yellow-400" />;
  };

  const getGradient = () => {
    if (item.type === "rank") {
      const rank = ranks.find((r) => r.id === item.productId);
      return rank?.color || "from-primary to-primary/70";
    }
    if (item.type === "crate") {
      const crate = crates.find((c) => c.id === item.productId);
      return crate?.color || "from-primary to-primary/70";
    }
    return "from-yellow-400 to-amber-600";
  };

  return (
    <div className="glass-card p-4 flex items-start gap-4">
      {/* Checkbox */}
      <div className="pt-1">
        <Checkbox
          checked={item.selected}
          onCheckedChange={() => toggleSelection(item.id)}
        />
      </div>

      {/* Product Icon */}
      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${getGradient()} flex items-center justify-center shrink-0`}>
        {getIcon()}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-foreground truncate">{name}</h3>
        <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
        <p className="font-display font-bold text-primary mt-1">
          {formatPrice(price * item.quantity)}
          {item.quantity > 1 && (
            <span className="text-xs text-muted-foreground font-normal ml-2">
              ({formatPrice(price)} each)
            </span>
          )}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-end gap-2">
        {!isRank ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
              className="w-16 h-8 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Qty: 1 (max)
          </span>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            onClick={() => saveForLater(item.id)}
          >
            <Bookmark className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => removeFromCart(item.id)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
};

const SavedItemCard = ({ item }: { item: { id: string; type: "rank" | "crate" | "money"; productId: string } }) => {
  const { moveToCart, removeSaved, getProductName, getProductPrice, hasRankInCart } = useCart();
  
  const name = getProductName(item.type, item.productId);
  const price = getProductPrice(item.type, item.productId);
  const isRank = item.type === "rank";
  const canMoveToCart = !isRank || !hasRankInCart();
  
  const getIcon = () => {
    if (item.type === "rank") return <Crown className="w-5 h-5 text-amber-400" />;
    if (item.type === "crate") return <Package className="w-5 h-5 text-blue-400" />;
    return <Coins className="w-5 h-5 text-yellow-400" />;
  };

  const getGradient = () => {
    if (item.type === "rank") {
      const rank = ranks.find((r) => r.id === item.productId);
      return rank?.color || "from-primary to-primary/70";
    }
    if (item.type === "crate") {
      const crate = crates.find((c) => c.id === item.productId);
      return crate?.color || "from-primary to-primary/70";
    }
    return "from-yellow-400 to-amber-600";
  };

  return (
    <div className="glass-card p-4 flex items-center gap-4">
      {/* Product Icon */}
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getGradient()} flex items-center justify-center shrink-0`}>
        {getIcon()}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-foreground truncate">{name}</h3>
        <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
        <p className="font-display font-bold text-primary mt-1">{formatPrice(price)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveToCart(item.id)}
          disabled={!canMoveToCart}
          title={!canMoveToCart ? "Remove current rank from cart first" : undefined}
        >
          <ShoppingCart className="w-4 h-4 mr-1" />
          Move to Cart
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => removeSaved(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const Cart = () => {
  const navigate = useNavigate();
  const {
    items,
    savedItems,
    selectAll,
    deselectAll,
    getSelectedItems,
    getSelectedTotal,
    getCartCount,
  } = useCart();

  const selectedItems = getSelectedItems();
  const selectedTotal = getSelectedTotal();
  const cartCount = getCartCount();
  const allSelected = items.length > 0 && items.every((item) => item.selected);
  const someSelected = selectedItems.length > 0;

  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate("/checkout");
  };

  return (
    <>
      <Helmet>
        <title>Cart - Axis Economy Store</title>
        <meta name="description" content="Review your cart and proceed to checkout." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Back button */}
            <Link
              to="/store"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>

            <Tabs defaultValue="cart" className="w-full">
              <TabsList className="grid w-full max-w-sm grid-cols-2 mb-8">
                <TabsTrigger value="cart" className="gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Cart ({cartCount})
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-2">
                  <BookmarkCheck className="w-4 h-4" />
                  Saved ({savedItems.length})
                </TabsTrigger>
              </TabsList>

              {/* Cart Tab */}
              <TabsContent value="cart">
                {items.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2">Your cart is empty</h2>
                    <p className="text-muted-foreground mb-6">
                      Add some items to your cart to get started!
                    </p>
                    <Button asChild variant="hero">
                      <Link to="/store">Browse Store</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Select All */}
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) =>
                              checked ? selectAll() : deselectAll()
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            Select All ({items.length} items)
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {selectedItems.length} selected
                        </span>
                      </div>

                      {/* Items */}
                      {items.map((item) => (
                        <CartItemCard key={item.id} item={item} />
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                      <div className="glass-card p-6 sticky top-24">
                        <h2 className="font-display text-xl font-bold mb-4">
                          Order Summary
                        </h2>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Selected items ({selectedItems.length})
                            </span>
                            <span>{formatPrice(selectedTotal)}</span>
                          </div>
                          <div className="border-t border-border pt-3">
                            <div className="flex justify-between font-bold">
                              <span>Total</span>
                              <span className="text-primary text-xl">
                                {formatPrice(selectedTotal)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="hero"
                          className="w-full"
                          disabled={!someSelected}
                          onClick={handleProceedToCheckout}
                        >
                          Proceed to Checkout
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        {!someSelected && (
                          <p className="text-xs text-muted-foreground text-center mt-3">
                            Select at least one item to checkout
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Saved for Later Tab */}
              <TabsContent value="saved">
                {savedItems.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                      <Bookmark className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2">No saved items</h2>
                    <p className="text-muted-foreground mb-6">
                      Items you save for later will appear here
                    </p>
                    <Button asChild variant="hero">
                      <Link to="/store">Browse Store</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedItems.map((item) => (
                      <SavedItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Cart;
