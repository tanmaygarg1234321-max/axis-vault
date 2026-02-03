import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PriceOverride {
  productType: string;
  productId: string;
  overridePrice: number;
}

export const usePriceOverrides = () => {
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("key", "price_overrides")
        .single();

      if (data && !error) {
        const parsed = JSON.parse(data.value);
        setOverrides(parsed);
      }
    } catch (err) {
      console.error("Error fetching price overrides:", err);
    }
    setLoading(false);
  };

  const getOverridePrice = (productType: string, productId: string): number | null => {
    const override = overrides.find(
      (o) => o.productType === productType && o.productId === productId
    );
    return override?.overridePrice ?? null;
  };

  return { overrides, loading, getOverridePrice, refetch: fetchOverrides };
};
