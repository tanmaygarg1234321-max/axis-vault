import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms & Refund Policy - Axis Economy Store</title>
        <meta name="description" content="Terms of service and refund policy for Axis Economy Store." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="font-display text-4xl font-bold mb-8 text-center">
              Terms & <span className="text-primary">Refund Policy</span>
            </h1>

            <div className="glass-card p-8 space-y-8">
              {/* Terms of Service */}
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Terms of Service
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    By purchasing from Axis Economy Store, you agree to the following terms:
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>All purchases are digital products for use on Axis SMP Minecraft server.</li>
                    <li>You must provide accurate Minecraft and Discord usernames.</li>
                    <li>Purchased items are non-transferable unless specified.</li>
                    <li>We reserve the right to ban players who abuse or chargeback purchases.</li>
                    <li>Server ranks are valid for 30 days from the date of purchase.</li>
                    <li>In-game items and currency are subject to server rules.</li>
                  </ul>
                </div>
              </section>

              {/* Refund Policy */}
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Refund Policy
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Due to the digital nature of our products, we have a limited refund policy:
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>
                      <strong className="text-foreground">No refunds</strong> after items have been
                      delivered to your account.
                    </li>
                    <li>
                      If delivery fails due to our system error, we will either retry delivery or
                      issue a full refund.
                    </li>
                    <li>
                      Chargebacks will result in permanent ban from the server and store.
                    </li>
                    <li>
                      Refund requests must be made within 24 hours of purchase via Discord.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Delivery */}
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Delivery
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Items are delivered automatically via our system.</li>
                    <li>
                      Most deliveries are instant, but may take up to 5 minutes during high
                      traffic.
                    </li>
                    <li>You must be online on the server to receive some items.</li>
                    <li>
                      If you haven't received your items within 10 minutes, contact support.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Payment */}
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Payment & Security
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>All payments are processed securely through Razorpay.</li>
                    <li>We do not store any payment card or UPI details.</li>
                    <li>Supported payment methods: UPI, Cards, Netbanking, Wallets.</li>
                    <li>All prices are in Indian Rupees (INR).</li>
                  </ul>
                </div>
              </section>

              {/* Contact */}
              <section>
                <h2 className="font-display text-xl font-bold mb-4 text-primary">
                  Contact Us
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>For support or refund requests, please contact us:</p>
                  <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>
                      Discord:{" "}
                      <a
                        href="https://discord.gg/f3NJw7ZJDw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        discord.gg/f3NJw7ZJDw
                      </a>
                    </li>
                    <li>
                      Email:{" "}
                      <a
                        href="mailto:axiseconomy@gmail.com"
                        className="text-primary hover:underline"
                      >
                        axiseconomy@gmail.com
                      </a>
                    </li>
                  </ul>
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

export default Terms;
