import { Button } from "@/components/ui/button";
import { Coins, Zap, ShoppingCart } from "lucide-react";
import { MoneyPackage, formatPrice } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";

interface MoneyCardProps {
  package_: MoneyPackage;
  popular?: boolean;
}

const MoneyCard = ({ package_, popular = false }: MoneyCardProps) => {
  const { addToCart } = useCart();

  return (
    <div
      className={`glass-card p-4 group hover:border-primary/50 transition-all duration-300 ${
        popular ? "ring-2 ring-secondary/50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-foreground">
              {package_.amount}
            </span>
            {popular && (
              <span className="ml-2 bg-secondary/20 text-secondary text-xs px-2 py-0.5 rounded-full font-semibold">
                BEST VALUE
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="font-display font-bold text-xl text-primary">
            {formatPrice(package_.price)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Zap className="w-3 h-3 text-primary" />
        <span>Instant delivery</span>
      </div>

      <Button
        variant="hero"
        size="sm"
        className="w-full"
        onClick={() => addToCart("money", package_.id)}
      >
        <ShoppingCart className="w-4 h-4 mr-1" />
        Add to Cart
      </Button>
    </div>
  );
};

export default MoneyCard;
