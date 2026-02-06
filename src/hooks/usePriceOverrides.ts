import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShopConfig {
  [key: string]: {
    price?: number;
    name?: string;
    command?: string;
    description?: string;
    perks?: string[];
    previewImage?: string;
    amount?: string;
    amountInt?: number;
  };
}

export const usePriceOverrides = () => {
  const [config, setConfig] = useState<ShopConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "shop_config")
        .single();

      if (data && !error) {
        const parsed = JSON.parse(data.value);
        setConfig(parsed || {});
      }
    } catch (err) {
      console.error("Error fetching shop config:", err);
    }
    setLoading(false);
  };

  const getOverridePrice = (productType: string, productId: string): number | null => {
    const key = `${productType}-${productId}`;
    return config[key]?.price ?? null;
  };

  const getPreviewImage = (productType: string, productId: string): string | null => {
    const key = `${productType}-${productId}`;
    return config[key]?.previewImage ?? null;
  };

  const getOverrideName = (productType: string, productId: string): string | null => {
    const key = `${productType}-${productId}`;
    return config[key]?.name ?? null;
  };

  const getOverridePerks = (productType: string, productId: string): string[] | null => {
    const key = `${productType}-${productId}`;
    return config[key]?.perks ?? null;
  };

  const getOverrideDescription = (productType: string, productId: string): string | null => {
    const key = `${productType}-${productId}`;
    return config[key]?.description ?? null;
  };

  return {
    config,
    loading,
    getOverridePrice,
    getPreviewImage,
    getOverrideName,
    getOverridePerks,
    getOverrideDescription,
    refetch: fetchConfig,
  };
};
