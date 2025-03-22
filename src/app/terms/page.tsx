import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-lg">
            Last updated: June 1, 2023
          </p>
        </div>

        <Card className="shadow-modern mb-8">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <h2>1. Introduction</h2>
              <p>
                Welcome to TMC ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the TMC platform, including any websites, mobile applications, and other online services that link to these Terms (collectively, the "Services").
              </p>
              <p>
                By accessing or using the Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Services.
              </p>

              <h2>2. Account Registration</h2>
              <p>
                To use certain features of the Services, you may need to register for an account. When you register, you agree to provide accurate, current, and complete information about yourself and to update this information to keep it accurate, current, and complete.
              </p>
              <p>
                You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.
              </p>

              <h2>3. Subscription Plans and Payments</h2>
              <p>
                TMC offers various subscription plans with different features and limitations. By subscribing to a paid plan, you agree to pay the applicable fees as described on our pricing page. All fees are exclusive of taxes, which you are responsible for paying.
              </p>
              <p>
                Subscription fees are billed in advance on a recurring basis, depending on the billing cycle you select. You authorize us to charge your payment method for all fees incurred in connection with your account.
              </p>
              <p>
                You may cancel your subscription at any time, but no refunds will be provided for any unused portion of your subscription period.
              </p>

              <h2>4. User Content</h2>
              <p>
                The Services allow you to create, upload, store, and share content, including text, images, and other materials ("User Content"). You retain all rights in your User Content, but you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your User Content in connection with providing and improving the Services.
              </p>
              <p>
                You are solely responsible for your User Content and the consequences of posting or publishing it. By posting User Content, you represent and warrant that you have all necessary rights to do so and that your User Content does not violate these Terms or any applicable laws.
              </p>

              <h2>5. Prohibited Conduct</h2>
              <p>
                You agree not to:
              </p>
              <ul>
                <li>Use the Services in any way that violates any applicable law or regulation</li>
                <li>Use the Services to transmit any material that is defamatory, offensive, or otherwise objectionable</li>
                <li>Attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Services</li>
                <li>Use any robot, spider, crawler, scraper, or other automated means to access the Services for any purpose</li>
                <li>Impersonate another person or misrepresent your affiliation with a person or entity</li>
                <li>Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Services</li>
              </ul>

              <h2>6. Intellectual Property</h2>
              <p>
                The Services and all content and materials included on the Services, other than User Content, such as text, graphics, logos, images, and software, are the property of TMC or our licensors and are protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                These Terms do not grant you any right, title, or interest in the Services or our content, other than the limited license to use the Services in accordance with these Terms.
              </p>

              <h2>7. Termination</h2>
              <p>
                We may terminate or suspend your access to the Services at any time, with or without cause, and with or without notice. Upon termination, your right to use the Services will immediately cease.
              </p>
              <p>
                All provisions of these Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>

              <h2>8. Disclaimer of Warranties</h2>
              <p>
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </p>
              <p>
                WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE, THAT DEFECTS WILL BE CORRECTED, OR THAT THE SERVICES OR THE SERVERS THAT MAKE THEM AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                IN NO EVENT WILL TMC, ITS AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
              </p>

              <h2>10. Changes to Terms</h2>
              <p>
                We may revise these Terms from time to time. The most current version will always be posted on our website. If a revision, in our sole discretion, is material, we will notify you via email or through the Services. By continuing to access or use the Services after revisions become effective, you agree to be bound by the revised Terms.
              </p>

              <h2>11. Governing Law</h2>
              <p>
                These Terms and your use of the Services shall be governed by and construed in accordance with the laws of the State of California, without giving effect to any choice or conflict of law provision or rule.
              </p>

              <h2>12. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at <a href="mailto:legal@tmcsystem.com" className="text-primary hover:underline">legal@tmcsystem.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            By using our Services, you acknowledge that you have read and understood these Terms and agree to be bound by them.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
