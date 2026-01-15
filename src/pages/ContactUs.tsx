import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const ContactUs = () => {
  const canonical =
    typeof window !== "undefined" ? `${window.location.origin}/contact` : undefined;

  return (
    <>
      <Helmet>
        <title>Contact Us - Axis Economy Store</title>
        <meta
          name="description"
          content="Contact Axis Economy Store support on Discord or by email."
        />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="font-display text-4xl font-bold mb-8 text-center">
              Contact <span className="text-primary">Us</span>
            </h1>

            <section className="glass-card p-8 space-y-6">
              <p className="text-muted-foreground">
                Need help with a purchase, delivery, or refund? Contact us using any method
                below.
              </p>

              <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                <li>
                  Discord server:{" "}
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
                  Discord username: <span className="text-foreground">nobodyguessed</span>
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

              <div className="pt-6 border-t border-border">
                <h2 className="font-display text-xl font-bold mb-2 text-primary">
                  Delivery help
                </h2>
                <p className="text-muted-foreground">
                  Delivery is usually under 5 minutes. If it takes longer, please open a ticket
                  on Discord.
                </p>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ContactUs;
