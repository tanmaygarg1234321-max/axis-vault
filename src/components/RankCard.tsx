import { Button } from "@/components/ui/button";
import { Check, Eye, Clock } from "lucide-react";
import { Rank, formatPrice } from "@/lib/products";
import { Link } from "react-router-dom";
import { useState } from "react";
import PreviewModal from "./PreviewModal";

interface RankCardProps {
  rank: Rank;
  featured?: boolean;
}

const RankCard = ({ rank, featured = false }: RankCardProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div
        className={`glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300 ${
          featured ? "ring-2 ring-primary/50 scale-105" : ""
        }`}
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${rank.color} p-4 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-lg text-white tracking-wider uppercase">
                {rank.name}
              </span>
              {featured && (
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  POPULAR
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display font-bold text-2xl text-white">
                {formatPrice(rank.price)}
              </span>
              <span className="text-white/80 text-sm">/ 30 days</span>
            </div>
          </div>
        </div>

        {/* Perks */}
        <div className="p-5 space-y-4">
          <ul className="space-y-2">
            {rank.perks.slice(0, 5).map((perk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{perk}</span>
              </li>
            ))}
            {rank.perks.length > 5 && (
              <li className="text-xs text-muted-foreground pl-6">
                +{rank.perks.length - 5} more perks
              </li>
            )}
          </ul>

          {/* Duration badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4" />
            <span>Expires in 30 days • Delivered instantly</span>
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
            <Button asChild variant="hero" size="sm" className="flex-1">
              <Link to={`/checkout?type=rank&id=${rank.id}`}>
                Buy Now
              </Link>
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
