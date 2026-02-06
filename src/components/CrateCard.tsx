import { Button } from "@/components/ui/button";
import { Package, Eye, Zap, ShoppingCart } from "lucide-react";
import { Crate, formatPrice } from "@/lib/products";
import { useState } from "react";
import PreviewModal from "./PreviewModal";
import { useCart } from "@/contexts/CartContext";

interface CrateCardProps {
  crate: Crate;
  overridePrice?: number | null;
  overrideName?: string | null;
  overrideDescription?: string | null;
  previewImage?: string | null;
}

const CrateCard = ({ crate, overridePrice, overrideName, overrideDescription, previewImage }: CrateCardProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { addToCart } = useCart();

  const displayName = overrideName || crate.name;
  const displayPrice = overridePrice ?? crate.price;
  const displayDescription = overrideDescription || crate.description;
  const displayImage = previewImage || `/previews/crate-${crate.id}.png`;

  return (
    <>
      <div className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${crate.color} p-4 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-white tracking-wider uppercase block">
                {displayName}
              </span>
              <span className="font-display font-bold text-xl text-white">
                {formatPrice(displayPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-5 space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {displayDescription}
          </p>

          {/* Instant delivery badge */}
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
            <Zap className="w-4 h-4" />
            <span>Instant delivery to your inventory</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="flex-1 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4"
              onClick={() => addToCart("crate", crate.id)}
            >
              <ShoppingCart className="w-4 h-4 shrink-0 mr-1" />
              <span className="truncate">Add</span>
            </Button>
          </div>
        </div>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={displayName}
        imageSrc={displayImage}
      />
    </>
  );
};

export default CrateCard;
