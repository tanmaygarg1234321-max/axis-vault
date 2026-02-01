import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePopularRank = () => {
  const [popularRankId, setPopularRankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPopularRank = async () => {
    try {
      // Get count of paid orders grouped by product_name for ranks
      const { data, error } = await supabase
        .from("orders")
        .select("product_name")
        .eq("product_type", "rank")
        .eq("payment_status", "paid");

      if (error) throw error;

      if (data && data.length > 0) {
        // Count occurrences of each rank
        const counts: Record<string, number> = {};
        data.forEach((order) => {
          const name = order.product_name.toLowerCase();
          counts[name] = (counts[name] || 0) + 1;
        });

        // Find the most popular
        let maxCount = 0;
        let mostPopular: string | null = null;
        
        Object.entries(counts).forEach(([name, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostPopular = name;
          }
        });

        // Map product name to rank id
        const nameToId: Record<string, string> = {
          stranger: "stranger",
          mythic: "mythic",
          amethyst: "amethyst",
        };

        if (mostPopular && nameToId[mostPopular]) {
          setPopularRankId(nameToId[mostPopular]);
        }
      }
    } catch (err) {
      console.error("Error fetching popular rank:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularRank();

    // Subscribe to real-time changes on orders table
    const channel = supabase
      .channel("orders_popularity")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          // Refetch when any order changes
          fetchPopularRank();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { popularRankId, loading };
};
