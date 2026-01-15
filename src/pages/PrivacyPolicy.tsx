import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/privacy-policy`
      : undefined;

  return (
    <>
      <Helmet>
        <title>Privacy Policy - Axis Economy Store</title>
        <meta
          name="description"
          content="Privacy policy for Axis Economy Store, including what information we collect and how we use it."
        />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="font-display text-4xl font-bold mb-8 text-center">
              Privacy <span className="text-primary">Policy</span>
            </h1>

            <div className="glass-card p-8 space-y-8">
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  What we collect
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>When you purchase, we may collect:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Minecraft username (for delivery)</li>
                    <li>Discord username (for support)</li>
                    <li>Email address (only if provided)</li>
                    <li>Order and payment reference IDs (for verification and support)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Payments
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    Payments are processed by our payment provider. We do not store your card/UPI
                    details in this website.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  How we use your information
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>To deliver your in-game items</li>
                    <li>To verify payments and prevent fraud/chargebacks</li>
                    <li>To provide support and resolve delivery issues</li>
                    <li>To keep basic logs for troubleshooting</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Contact
                </h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    If you have privacy questions, email{" "}
                    <a
                      href="mailto:axiseconomy@gmail.com"
                      className="text-primary hover:underline"
                    >
                      axiseconomy@gmail.com
                    </a>
                    .
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

export default PrivacyPolicy;
