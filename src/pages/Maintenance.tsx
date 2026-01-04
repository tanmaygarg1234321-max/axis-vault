import { Construction, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const Maintenance = () => {
  return (
    <>
      <Helmet>
        <title>Maintenance - Axis Economy Store</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Construction className="w-12 h-12 text-secondary" />
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            🚧 Maintenance in Progress
          </h1>

          <p className="text-muted-foreground mb-8">
            The store is temporarily unavailable while we make some improvements.
            <br />
            Please check back later.
          </p>

          <Button asChild variant="outline">
            <a href="https://discord.gg/f3NJw7ZJDw" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              Join Discord for Updates
            </a>
          </Button>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
