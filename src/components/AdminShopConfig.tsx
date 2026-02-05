import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Crown,
  Package,
  Coins,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  RotateCcw,
  Image,
  Terminal,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, ranks, crates, moneyPackages } from "@/lib/products";
import { invokeEdgeFunction } from "@/lib/edge-functions";
import { supabase } from "@/integrations/supabase/client";

interface ShopProduct {
  id: string;
  type: "rank" | "crate" | "money";
  name: string;
  price: number;
  description?: string;
  perks?: string[];
  color?: string;
  command?: string;
  duration?: string;
  amount?: string;
  amountInt?: number;
  previewImage?: string;
}

interface AdminShopConfigProps {
  getAdminHeaders: () => Record<string, string> | undefined;
}

const AdminShopConfig = ({ getAdminHeaders }: AdminShopConfigProps) => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editProduct, setEditProduct] = useState<ShopProduct | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, any>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load products from static files and any overrides from database
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Fetch price overrides from database
      const { data: settings } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "shop_config")
        .single();
      
      if (settings?.value) {
        try {
          const config = JSON.parse(settings.value);
          setPriceOverrides(config);
        } catch (e) {
          console.error("Failed to parse shop config:", e);
        }
      }

      // Build products list from static files
      const allProducts: ShopProduct[] = [
        ...ranks.map(r => ({
          id: r.id,
          type: "rank" as const,
          name: r.name,
          price: r.price,
          perks: r.perks,
          color: r.color,
          command: r.command,
          duration: r.duration,
          previewImage: `/previews/rank-${r.id}.png`,
        })),
        ...crates.map(c => ({
          id: c.id,
          type: "crate" as const,
          name: c.name,
          price: c.price,
          description: c.description,
          color: c.color,
          command: c.command,
          previewImage: `/previews/crate-${c.id}.png`,
        })),
        ...moneyPackages.map(m => ({
          id: m.id,
          type: "money" as const,
          name: `${m.amount} In-Game Money`,
          price: m.price,
          amount: m.amount,
          amountInt: m.amountInt,
          command: m.command,
        })),
      ];

      setProducts(allProducts);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load shop configuration");
    }
    setLoading(false);
  };

  const getProductPrice = (product: ShopProduct): number => {
    const key = `${product.type}-${product.id}`;
    return priceOverrides[key]?.price ?? product.price;
  };

  const getProductCommand = (product: ShopProduct): string => {
    const key = `${product.type}-${product.id}`;
    return priceOverrides[key]?.command ?? product.command ?? "";
  };

  const getProductName = (product: ShopProduct): string => {
    const key = `${product.type}-${product.id}`;
    return priceOverrides[key]?.name ?? product.name;
  };

  const updateProductOverride = (product: ShopProduct, field: string, value: any) => {
    const key = `${product.type}-${product.id}`;
    setPriceOverrides(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const resetProduct = (product: ShopProduct) => {
    const key = `${product.type}-${product.id}`;
    setPriceOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetAllProducts = () => {
    setPriceOverrides({});
    toast.success("All products reset to defaults");
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      await invokeEdgeFunction("admin-action", {
        headers: getAdminHeaders(),
        body: {
          action: "save_shop_config",
          config: priceOverrides,
        },
      });
      toast.success("Shop configuration saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    }
    setSaving(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editProduct || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        try {
          const response = await invokeEdgeFunction<{ success: boolean; url: string }>("admin-action", {
            headers: getAdminHeaders(),
            body: {
              action: "upload_preview_image",
              productId: editProduct.id,
              productType: editProduct.type,
              imageData: base64Data,
              fileName: file.name,
            },
          });
          
          if (response.url) {
            // Update the edit product with new image URL
            setEditProduct(prev => prev ? { ...prev, previewImage: response.url } : null);
            
            // Also update the price overrides
            const key = `${editProduct.type}-${editProduct.id}`;
            setPriceOverrides(prev => ({
              ...prev,
              [key]: {
                ...(prev[key] || {}),
                previewImage: response.url,
              },
            }));
            
            toast.success("Image uploaded successfully!");
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to upload image");
        }
        
        setUploadingImage(false);
      };
      
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
      setUploadingImage(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getProductPreviewImage = (product: ShopProduct): string => {
    const key = `${product.type}-${product.id}`;
    return priceOverrides[key]?.previewImage ?? product.previewImage ?? "";
  };

  const handleEditSubmit = () => {
    if (!editProduct) return;
    
    const key = `${editProduct.type}-${editProduct.id}`;
    setPriceOverrides(prev => ({
      ...prev,
      [key]: {
        price: editProduct.price,
        name: editProduct.name,
        command: editProduct.command,
        description: editProduct.description,
        perks: editProduct.perks,
        previewImage: editProduct.previewImage || prev[key]?.previewImage,
      },
    }));
    
    setEditDialogOpen(false);
    setEditProduct(null);
    toast.success("Product updated. Remember to save!");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "rank": return <Crown className="w-4 h-4 text-amber-400" />;
      case "crate": return <Package className="w-4 h-4 text-purple-400" />;
      case "money": return <Coins className="w-4 h-4 text-yellow-400" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rankProducts = products.filter(p => p.type === "rank");
  const crateProducts = products.filter(p => p.type === "crate");
  const moneyProducts = products.filter(p => p.type === "money");

  return (
    <div className="space-y-6">
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editProduct && getTypeIcon(editProduct.type)}
              Edit {editProduct?.type === "rank" ? "Rank" : editProduct?.type === "crate" ? "Crate" : "Money Package"}
            </DialogTitle>
            <DialogDescription>
              Modify product details. Changes are saved locally until you click "Save All Changes".
            </DialogDescription>
          </DialogHeader>
          
          {editProduct && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={editProduct.price}
                    onChange={(e) => setEditProduct({ ...editProduct, price: parseInt(e.target.value) || 0 })}
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  RCON Command
                </Label>
                <Input
                  value={editProduct.command || ""}
                  onChange={(e) => setEditProduct({ ...editProduct, command: e.target.value })}
                  className="bg-background/50 font-mono text-sm"
                  placeholder={
                    editProduct.type === "rank" 
                      ? "lp user {username} parent addtemp RankName 30d"
                      : editProduct.type === "crate"
                      ? "crates giveKey CrateName {username} 1"
                      : "eco give {username} 1000000"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{username}"} as a placeholder for the player's Minecraft username.
                  {editProduct.type === "money" && " Use {amount} for the money amount."}
                </p>
              </div>

              {editProduct.type === "crate" && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editProduct.description || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                    className="bg-background/50"
                    rows={2}
                  />
                </div>
              )}

              {editProduct.type === "rank" && (
                <div className="space-y-2">
                  <Label>Perks (one per line)</Label>
                  <Textarea
                    value={editProduct.perks?.join("\n") || ""}
                    onChange={(e) => setEditProduct({ 
                      ...editProduct, 
                      perks: e.target.value.split("\n").filter(p => p.trim()) 
                    })}
                    className="bg-background/50"
                    rows={5}
                  />
                </div>
              )}

              {editProduct.type === "money" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Amount</Label>
                    <Input
                      value={editProduct.amount || ""}
                      onChange={(e) => setEditProduct({ ...editProduct, amount: e.target.value })}
                      className="bg-background/50"
                      placeholder="e.g., 10M, 1B"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Amount (Integer)</Label>
                    <Input
                      type="number"
                      value={editProduct.amountInt || 0}
                      onChange={(e) => setEditProduct({ ...editProduct, amountInt: parseInt(e.target.value) || 0 })}
                      className="bg-background/50"
                      placeholder="e.g., 10000000"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Preview Image
                </Label>
                
                {/* Image Preview */}
                {editProduct.previewImage && (
                  <div className="relative w-full h-32 bg-muted/30 rounded-lg overflow-hidden">
                    <img
                      src={editProduct.previewImage}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                
                {/* Upload Button */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex-1"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </Button>
                </div>
                
                {/* Manual URL Input */}
                <Input
                  value={editProduct.previewImage || ""}
                  onChange={(e) => setEditProduct({ ...editProduct, previewImage: e.target.value })}
                  className="bg-background/50"
                  placeholder="Or enter image URL manually"
                />
                <p className="text-xs text-muted-foreground">
                  Upload an image or paste a URL. Recommended size: 400x300px
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>
              <Save className="w-4 h-4 mr-2" />
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Shop Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage all products, prices, and commands</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAllProducts}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <Button onClick={saveConfiguration} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Ranks Section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Ranks
          </CardTitle>
          <CardDescription>
            Manage rank products with 30-day duration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Command</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankProducts.map((product) => {
                const key = `${product.type}-${product.id}`;
                const isModified = !!priceOverrides[key];
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {getProductName(product)}
                      {isModified && <span className="ml-2 text-xs text-primary">•</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={getProductPrice(product)}
                        onChange={(e) => updateProductOverride(product, "price", parseInt(e.target.value) || 0)}
                        className={`w-24 h-8 ${isModified ? "border-primary" : ""}`}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        lp user ... addtemp {getProductCommand(product)} 30d
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditProduct({
                              ...product,
                              price: getProductPrice(product),
                              name: getProductName(product),
                              command: getProductCommand(product),
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetProduct(product)}
                          disabled={!isModified}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Crates Section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            Crates
          </CardTitle>
          <CardDescription>
            Manage crate key products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Command</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crateProducts.map((product) => {
                const key = `${product.type}-${product.id}`;
                const isModified = !!priceOverrides[key];
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {getProductName(product)}
                      {isModified && <span className="ml-2 text-xs text-primary">•</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={getProductPrice(product)}
                        onChange={(e) => updateProductOverride(product, "price", parseInt(e.target.value) || 0)}
                        className={`w-24 h-8 ${isModified ? "border-primary" : ""}`}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        crates giveKey {getProductCommand(product)} ...
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditProduct({
                              ...product,
                              price: getProductPrice(product),
                              name: getProductName(product),
                              command: getProductCommand(product),
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetProduct(product)}
                          disabled={!isModified}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Money Section */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            Money Packages
          </CardTitle>
          <CardDescription>
            Manage in-game currency packages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Command</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moneyProducts.map((product) => {
                const key = `${product.type}-${product.id}`;
                const isModified = !!priceOverrides[key];
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.amount}
                      {isModified && <span className="ml-2 text-xs text-primary">•</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={getProductPrice(product)}
                        onChange={(e) => updateProductOverride(product, "price", parseInt(e.target.value) || 0)}
                        className={`w-24 h-8 ${isModified ? "border-primary" : ""}`}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        eco give ... {product.amountInt}
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditProduct({
                              ...product,
                              price: getProductPrice(product),
                              name: getProductName(product),
                              command: getProductCommand(product),
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetProduct(product)}
                          disabled={!isModified}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Command Reference */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Command Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-sm mb-1">Ranks</p>
              <code className="text-xs text-muted-foreground">lp user {"{username}"} parent addtemp {"{RankName}"} 30d</code>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-sm mb-1">Crates</p>
              <code className="text-xs text-muted-foreground">crates giveKey {"{CrateName}"} {"{username}"} {"{quantity}"}</code>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-sm mb-1">Money</p>
              <code className="text-xs text-muted-foreground">eco give {"{username}"} {"{amount}"}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShopConfig;
