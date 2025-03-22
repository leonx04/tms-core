import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Cookie Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Last updated: June 1, 2023
          </p>
        </div>

        <Card className="shadow-modern mb-8">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <h2>1. Introduction</h2>
              <p>
                This Cookie Policy explains how TMC ("we", "our", or "us") uses
                cookies and similar technologies to recognize you when you visit
                our website and use our services. It explains what these
                technologies are and why we use them, as well as your rights to
                control our use of them.
              </p>

              <h2>2. What Are Cookies?</h2>
              <p>
                Cookies are small data files that are placed on your computer or
                mobile device when you visit a website. Cookies are widely used
                by website owners to make their websites work, or to work more
                efficiently, as well as to provide reporting information.
              </p>
              <p>
                Cookies set by the website owner (in this case, TMC) are called
                "first-party cookies". Cookies set by parties other than the
                website owner are called "third-party cookies". Third-party
                cookies enable third-party features or functionality to be
                provided on or through the website (e.g., advertising,
                interactive content, and analytics).
              </p>

              <h2>3. Why Do We Use Cookies?</h2>
              <p>
                We use first-party and third-party cookies for several reasons.
                Some cookies are required for technical reasons in order for our
                website to operate, and we refer to these as "essential" or
                "strictly necessary" cookies. Other cookies enable us to track
                and target the interests of our users to enhance the experience
                on our website. Third parties serve cookies through our website
                for analytics and other purposes.
              </p>

              <h2>4. Types of Cookies We Use</h2>
              <p>
                The specific types of first and third-party cookies served
                through our website and the purposes they perform are described
                below:
              </p>

              <h3>4.1 Essential Cookies</h3>
              <p>
                These cookies are strictly necessary to provide you with
                services available through our website and to use some of its
                features, such as access to secure areas. Because these cookies
                are strictly necessary to deliver the website, you cannot refuse
                them without impacting how our website functions.
              </p>
              <ul>
                <li>
                  <strong>Session Cookies:</strong> These cookies are used to
                  maintain your session state and authenticate you during your
                  visit.
                </li>
                <li>
                  <strong>Security Cookies:</strong> These cookies help us
                  detect and prevent security risks, such as unauthorized login
                  attempts.
                </li>
              </ul>

              <h3>4.2 Performance and Functionality Cookies</h3>
              <p>
                These cookies are used to enhance the performance and
                functionality of our website but are non-essential to their use.
                However, without these cookies, certain functionality may become
                unavailable.
              </p>
              <ul>
                <li>
                  <strong>Preference Cookies:</strong> These cookies remember
                  your preferences, such as language or region, to provide a
                  more personalized experience.
                </li>
                <li>
                  <strong>Feature Cookies:</strong> These cookies help us
                  remember choices you make (such as your username, language, or
                  the region you are in) and provide enhanced, more personal
                  features.
                </li>
              </ul>

              <h3>4.3 Analytics and Customization Cookies</h3>
              <p>
                These cookies collect information that is used either in
                aggregate form to help us understand how our website is being
                used or how effective our marketing campaigns are, or to help us
                customize our website for you.
              </p>
              <ul>
                <li>
                  <strong>Google Analytics:</strong> We use Google Analytics to
                  collect information about how visitors use our website. These
                  cookies collect information in an anonymous form, including
                  the number of visitors to the website, where visitors have
                  come to the website from, and the pages they visited.
                </li>
                <li>
                  <strong>Hotjar:</strong> We use Hotjar to better understand
                  our users' needs and to optimize this service and experience.
                  Hotjar is a technology service that helps us better understand
                  our users' experience (e.g., how much time they spend on which
                  pages, which links they choose to click, what users do and
                  don't like, etc.).
                </li>
              </ul>

              <h3>4.4 Marketing Cookies</h3>
              <p>
                These cookies are used to track visitors across websites. The
                intention is to display ads that are relevant and engaging for
                the individual user and thereby more valuable for publishers and
                third-party advertisers.
              </p>
              <ul>
                <li>
                  <strong>Social Media Cookies:</strong> These cookies are set
                  by social media services that we have added to the site to
                  enable you to share our content with your friends and
                  networks.
                </li>
                <li>
                  <strong>Advertising Cookies:</strong> These cookies are used
                  to make advertising messages more relevant to you. They
                  perform functions like preventing the same ad from
                  continuously reappearing, ensuring that ads are properly
                  displayed, and in some cases selecting advertisements that are
                  based on your interests.
                </li>
              </ul>

              <h2>5. How Can You Control Cookies?</h2>
              <p>
                You have the right to decide whether to accept or reject
                cookies. You can exercise your cookie preferences by clicking on
                the appropriate opt-out links provided in the cookie banner on
                our website.
              </p>
              <p>
                You can also set or amend your web browser controls to accept or
                refuse cookies. If you choose to reject cookies, you may still
                use our website though your access to some functionality and
                areas of our website may be restricted. As the means by which
                you can refuse cookies through your web browser controls vary
                from browser to browser, you should visit your browser's help
                menu for more information.
              </p>
              <p>
                In addition, most advertising networks offer you a way to opt
                out of targeted advertising. If you would like to find out more
                information, please visit{" "}
                <a
                  href="http://www.aboutads.info/choices/"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  http://www.aboutads.info/choices/
                </a>{" "}
                or{" "}
                <a
                  href="http://www.youronlinechoices.com"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  http://www.youronlinechoices.com
                </a>
                .
              </p>

              <h2>6. How Often Will We Update This Cookie Policy?</h2>
              <p>
                We may update this Cookie Policy from time to time in order to
                reflect, for example, changes to the cookies we use or for other
                operational, legal, or regulatory reasons. Please therefore
                revisit this Cookie Policy regularly to stay informed about our
                use of cookies and related technologies.
              </p>
              <p>
                The date at the top of this Cookie Policy indicates when it was
                last updated.
              </p>

              <h2>7. Where Can You Get Further Information?</h2>
              <p>
                If you have any questions about our use of cookies or other
                technologies, please contact us at{" "}
                <a
                  href="mailto:privacy@tmcsystem.com"
                  className="text-primary hover:underline"
                >
                  privacy@tmcsystem.com
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            By using our Services, you acknowledge that you have read and
            understood this Cookie Policy and agree to its terms.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
