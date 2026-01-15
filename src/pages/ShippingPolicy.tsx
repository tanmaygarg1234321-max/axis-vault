import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const ShippingPolicy = () => {
  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/shipping-policy`
      : undefined;

  return (
    <>
      <Helmet>
        <title>Shipping Policy - Axis Economy Store</title>
        <meta
          name="description"
          content="Shipping policy for Axis Economy Store. Digital deliveries are typically completed within 5 minutes."
        />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="font-display text-4xl font-bold mb-8 text-center">
              Shipping <span className="text-primary">Policy</span>
            </h1>

            <div className="glass-card p-8 space-y-8">
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Digital delivery
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    All products sold here are digital items delivered in-game on the Axis SMP
                    Minecraft server.
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Typical delivery time: under 5 minutes.</li>
                    <li>You may need to be online in the server to receive some items.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  If delivery takes longer than 5 minutes
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    If your items are not delivered within 5 minutes, please open a ticket on our
                    Discord server.
                  </p>
                  <p>
                    Discord:{" "}
                    <a
                      href="https://discord.gg/f3NJw7ZJDw"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      discord.gg/f3NJw7ZJDw
                    </a>
                    {" "}or visit the{" "}
                    <Link to="/contact" className="text-primary hover:underline">
                      Contact Us
                    </Link>
                    {" "}page.
                  </p>
                </div>
              </section>

              <div className="pt-6 border-t border-border text-center text-sm text-muted-foreground">
                <p>Last updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ShippingPolicy;
