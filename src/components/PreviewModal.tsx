import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ImageOff } from "lucide-react";
import { useState } from "react";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  imageSrc: string;
}

const PreviewModal = ({ open, onClose, title, imageSrc }: PreviewModalProps) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg">{title} Preview</DialogTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>
        <div className="p-4">
          <div className="w-full aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {imageError ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageOff className="w-12 h-12" />
                <span className="text-sm">Preview coming soon</span>
              </div>
            ) : (
              <img
                src={imageSrc}
                alt={`${title} preview`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewModal;
