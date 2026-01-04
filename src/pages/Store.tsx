import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RankCard from "@/components/RankCard";
import CrateCard from "@/components/CrateCard";
import MoneyCard from "@/components/MoneyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Package, Coins } from "lucide-react";
import { ranks, crates, moneyPackages } from "@/lib/products";
import { Helmet } from "react-helmet-async";

const Store = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "ranks");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["ranks", "crates", "money"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <>
      <Helmet>
        <title>Store - Axis Economy Store</title>
        <meta name="description" content="Browse and purchase ranks, crates, and in-game money for Axis SMP. Secure payments and instant delivery." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4">
            {/* Page Header */}
            <div className="text-center mb-12">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient-primary">Store</span>
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Choose from our selection of ranks, crates, and money packages
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-12 bg-muted/50 p-1 h-auto">
                <TabsTrigger
                  value="ranks"
                  className="font-display text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Ranks
                </TabsTrigger>
                <TabsTrigger
                  value="crates"
                  className="font-display text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Crates
                </TabsTrigger>
                <TabsTrigger
                  value="money"
                  className="font-display text-sm py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Money
                </TabsTrigger>
              </TabsList>

              {/* Ranks Tab */}
              <TabsContent value="ranks" className="mt-0">
                <div className="mb-8">
                  <h2 className="font-display text-2xl font-bold text-center mb-2">
                    Server Ranks
                  </h2>
                  <p className="text-muted-foreground text-center text-sm">
                    All ranks last for 30 days and include exclusive perks
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {ranks.map((rank, index) => (
                    <RankCard
                      key={rank.id}
                      rank={rank}
                      featured={rank.id === "mythic"}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Crates Tab */}
              <TabsContent value="crates" className="mt-0">
                <div className="mb-8">
                  <h2 className="font-display text-2xl font-bold text-center mb-2">
                    Crate Keys
                  </h2>
                  <p className="text-muted-foreground text-center text-sm">
                    Open crates for random rewards and exclusive items
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {crates.map((crate) => (
                    <CrateCard key={crate.id} crate={crate} />
                  ))}
                </div>
              </TabsContent>

              {/* Money Tab */}
              <TabsContent value="money" className="mt-0">
                <div className="mb-8">
                  <h2 className="font-display text-2xl font-bold text-center mb-2">
                    In-Game Money
                  </h2>
                  <p className="text-muted-foreground text-center text-sm">
                    Instant economy boost delivered directly to your account
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {moneyPackages.map((pkg, index) => (
                    <MoneyCard
                      key={pkg.id}
                      package_={pkg}
                      popular={pkg.id === "50m"}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Store;
