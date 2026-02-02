import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Rank, Crate, MoneyPackage, ranks, crates, moneyPackages } from "@/lib/products";
import { toast } from "sonner";

export type CartItemType = "rank" | "crate" | "money";

export interface CartItem {
  id: string;
  type: CartItemType;
  productId: string;
  quantity: number;
  selected: boolean;
}

export interface SavedForLaterItem {
  id: string;
  type: CartItemType;
  productId: string;
}

interface CartContextType {
  items: CartItem[];
  savedItems: SavedForLaterItem[];
  addToCart: (type: CartItemType, productId: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  removeSaved: (id: string) => void;
  clearCart: () => void;
  getSelectedItems: () => CartItem[];
  getCartTotal: () => number;
  getSelectedTotal: () => number;
  getCartCount: () => number;
  hasRankInCart: () => boolean;
  getProduct: (type: CartItemType, productId: string) => Rank | Crate | MoneyPackage | undefined;
  getProductPrice: (type: CartItemType, productId: string) => number;
  getProductName: (type: CartItemType, productId: string) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "axis-eco-cart";
const SAVED_STORAGE_KEY = "axis-eco-saved";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [savedItems, setSavedItems] = useState<SavedForLaterItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SAVED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
  }, [savedItems]);

  const getProduct = (type: CartItemType, productId: string): Rank | Crate | MoneyPackage | undefined => {
    if (type === "rank") return ranks.find((r) => r.id === productId);
    if (type === "crate") return crates.find((c) => c.id === productId);
    if (type === "money") return moneyPackages.find((m) => m.id === productId);
    return undefined;
  };

  const getProductPrice = (type: CartItemType, productId: string): number => {
    const product = getProduct(type, productId);
    return product?.price ?? 0;
  };

  const getProductName = (type: CartItemType, productId: string): string => {
    const product = getProduct(type, productId);
    if (!product) return "Unknown Product";
    if (type === "rank") return `${(product as Rank).name} Rank`;
    if (type === "crate") return (product as Crate).name;
    if (type === "money") return `${(product as MoneyPackage).amount} In-Game Money`;
    return "Unknown Product";
  };

  const hasRankInCart = (): boolean => {
    return items.some((item) => item.type === "rank");
  };

  const addToCart = (type: CartItemType, productId: string) => {
    // Check if adding a rank and already have one
    if (type === "rank" && hasRankInCart()) {
      toast.error("You can only have one rank in your cart. Please remove the existing rank first.");
      return;
    }

    // Check if item already exists (for crates and money)
    const existingItem = items.find((item) => item.type === type && item.productId === productId);

    if (existingItem) {
      if (type === "rank") {
        toast.error("This rank is already in your cart.");
        return;
      }
      // Increase quantity for crates and money
      setItems((prev) =>
        prev.map((item) =>
          item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      toast.success("Quantity updated in cart!");
    } else {
      const newItem: CartItem = {
        id: `${type}-${productId}-${Date.now()}`,
        type,
        productId,
        quantity: 1,
        selected: true,
      };
      setItems((prev) => [...prev, newItem]);
      toast.success("Added to cart!");
    }
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success("Removed from cart");
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }
    
    const item = items.find((i) => i.id === id);
    if (item?.type === "rank" && quantity > 1) {
      toast.error("You can only purchase one rank at a time.");
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const toggleSelection = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const selectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  };

  const saveForLater = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Check if already saved
    const alreadySaved = savedItems.some(
      (s) => s.type === item.type && s.productId === item.productId
    );

    if (!alreadySaved) {
      setSavedItems((prev) => [
        ...prev,
        { id: `saved-${item.type}-${item.productId}`, type: item.type, productId: item.productId },
      ]);
    }

    removeFromCart(id);
    toast.success("Saved for later");
  };

  const moveToCart = (id: string) => {
    const saved = savedItems.find((s) => s.id === id);
    if (!saved) return;

    // Check rank limit
    if (saved.type === "rank" && hasRankInCart()) {
      toast.error("You already have a rank in your cart. Remove it first to add a different one.");
      return;
    }

    addToCart(saved.type, saved.productId);
    setSavedItems((prev) => prev.filter((s) => s.id !== id));
  };

  const removeSaved = (id: string) => {
    setSavedItems((prev) => prev.filter((s) => s.id !== id));
    toast.success("Removed from saved items");
  };

  const clearCart = () => {
    setItems([]);
  };

  const getSelectedItems = (): CartItem[] => {
    return items.filter((item) => item.selected);
  };

  const getCartTotal = (): number => {
    return items.reduce((total, item) => {
      return total + getProductPrice(item.type, item.productId) * item.quantity;
    }, 0);
  };

  const getSelectedTotal = (): number => {
    return items
      .filter((item) => item.selected)
      .reduce((total, item) => {
        return total + getProductPrice(item.type, item.productId) * item.quantity;
      }, 0);
  };

  const getCartCount = (): number => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        savedItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleSelection,
        selectAll,
        deselectAll,
        saveForLater,
        moveToCart,
        removeSaved,
        clearCart,
        getSelectedItems,
        getCartTotal,
        getSelectedTotal,
        getCartCount,
        hasRankInCart,
        getProduct,
        getProductPrice,
        getProductName,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
