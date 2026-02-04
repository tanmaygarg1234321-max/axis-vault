import { Button } from "@/components/ui/button";
import { Check, Eye, Clock, ShoppingCart } from "lucide-react";
import { Rank, formatPrice } from "@/lib/products";
import { useState } from "react";
import PreviewModal from "./PreviewModal";
import { useCart } from "@/contexts/CartContext";

interface RankCardProps {
  rank: Rank;
  featured?: boolean;
}

const RankCard = ({ rank, featured = false }: RankCardProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { addToCart, hasRankInCart } = useCart();
  const rankInCart = hasRankInCart();

  return (
    <>
      <div
        className={`glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300 ${
          featured ? "ring-2 ring-primary/50 scale-105" : ""
        }`}
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${rank.color} p-5 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.1) 10px,
              rgba(255,255,255,0.1) 20px
            )`
          }} />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xl text-white tracking-wider uppercase drop-shadow-lg">
                {rank.name}
              </span>
              {featured && (
                <span className="bg-white/25 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                  Popular
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display font-bold text-3xl text-white drop-shadow-lg">
                {formatPrice(rank.price)}
              </span>
              <span className="text-white/80 text-sm font-medium">/ 30 days</span>
            </div>
          </div>
        </div>

        {/* Perks */}
        <div className="p-5 space-y-4">
          <ul className="space-y-2.5">
            {rank.perks.slice(0, 5).map((perk, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${rank.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-muted-foreground leading-snug">{perk}</span>
              </li>
            ))}
            {rank.perks.length > 5 && (
              <li className="text-xs text-primary font-medium pl-8">
                +{rank.perks.length - 5} more perks
              </li>
            )}
          </ul>

          {/* Duration badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5 border border-border/50">
            <Clock className="w-4 h-4 text-primary" />
            <span>Expires in 30 days • Delivered instantly</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="flex-1 h-10"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Preview
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="flex-1 h-10 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4"
              onClick={() => addToCart("rank", rank.id)}
              disabled={rankInCart}
              title={rankInCart ? "You already have a rank in your cart" : undefined}
            >
              <ShoppingCart className="w-4 h-4 shrink-0 mr-1" />
              <span className="truncate">{rankInCart ? "In Cart" : "Add"}</span>
            </Button>
          </div>
        </div>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`${rank.name} Rank`}
        imageSrc={`/previews/rank-${rank.id}.png`}
      />
    </>
  );
};

export default RankCard;
