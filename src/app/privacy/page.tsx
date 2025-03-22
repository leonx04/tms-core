import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">Last updated: June 1, 2023</p>
        </div>

        <Card className="shadow-modern mb-8">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <h2>1. Introduction</h2>
              <p>
                At TMC, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our task management system ("TMC", "we", "our", or "us").
              </p>
              <p>
                Please read this Privacy Policy carefully. By accessing or using TMC, you acknowledge that you have
                read, understood, and agree to be bound by all the terms of this Privacy Policy.
              </p>

              <h2>2. Information We Collect</h2>
              <p>We collect several types of information from and about users of our platform:</p>
              <h3>2.1 Personal Information</h3>
              <p>When you register for an account, we collect:</p>
              <ul>
                <li>Name</li>
                <li>Email address</li>
                <li>Password (stored in encrypted form)</li>
                <li>Profile picture (optional)</li>
                <li>GitHub username (optional)</li>
              </ul>

              <h3>2.2 Usage Information</h3>
              <p>As you navigate through and interact with our platform, we may collect:</p>
              <ul>
                <li>Log data (IP address, browser type, pages visited, time spent)</li>
                <li>Device information (device type, operating system)</li>
                <li>Usage patterns and preferences</li>
              </ul>

              <h3>2.3 Project and Task Data</h3>
              <p>When you use TMC, we collect and store:</p>
              <ul>
                <li>Project information (name, description, members)</li>
                <li>Task details (title, description, status, assignments)</li>
                <li>Comments and attachments</li>
                <li>GitHub integration data (commits, pull requests)</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative notifications, such as updates or security alerts</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Personalize your experience</li>
                <li>Detect, prevent, and address technical issues</li>
              </ul>

              <h2>4. How We Share Your Information</h2>
              <p>We may share your information in the following situations:</p>
              <ul>
                <li>
                  <strong>With Team Members:</strong> Information shared within projects is visible to other project
                  members based on their roles and permissions.
                </li>
                <li>
                  <strong>Service Providers:</strong> We may share information with third-party vendors who provide
                  services on our behalf (e.g., hosting, email delivery).
                </li>
                <li>
                  <strong>Business Transfers:</strong> If TMC is involved in a merger, acquisition, or sale of assets,
                  your information may be transferred as part of that transaction.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in
                  response to valid requests by public authorities.
                </li>
              </ul>

              <h2>5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information from
                unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over
                the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>

              <h2>6. Your Data Protection Rights</h2>
              <p>Depending on your location, you may have certain rights regarding your personal information:</p>
              <ul>
                <li>
                  <strong>Access:</strong> You can request copies of your personal information.
                </li>
                <li>
                  <strong>Rectification:</strong> You can request that we correct inaccurate or incomplete information.
                </li>
                <li>
                  <strong>Erasure:</strong> You can request that we delete your personal information in certain
                  circumstances.
                </li>
                <li>
                  <strong>Restriction:</strong> You can request that we restrict the processing of your information.
                </li>
                <li>
                  <strong>Data Portability:</strong> You can request a copy of your information in a structured,
                  commonly used, and machine-readable format.
                </li>
                <li>
                  <strong>Objection:</strong> You can object to our processing of your information in certain
                  circumstances.
                </li>
              </ul>
              <p>
                To exercise these rights, please contact us at{" "}
                <a href="mailto:privacy@tmcsystem.com" className="text-primary hover:underline">
                  privacy@tmcsystem.com
                </a>
                .
              </p>

              <h2>7. Cookies and Similar Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our platform and hold certain
                information. Cookies are files with a small amount of data that may include an anonymous unique
                identifier.
              </p>
              <p>
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However,
                if you do not accept cookies, you may not be able to use some portions of our platform.
              </p>
              <p>
                For more information about the cookies we use, please see our{" "}
                <Link href="/cookies" className="text-primary hover:underline">
                  Cookie Policy
                </Link>
                .
              </p>

              <h2>8. Children's Privacy</h2>
              <p>
                Our platform is not intended for children under 16 years of age. We do not knowingly collect personal
                information from children under 16. If we learn we have collected personal information from a child
                under 16, we will delete that information.
              </p>

              <h2>9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than the country in which you
                reside. These countries may have data protection laws that are different from the laws of your country.
              </p>
              <p>
                When we transfer your information to other countries, we will protect that information as described in
                this Privacy Policy and in accordance with applicable law.
              </p>

              <h2>10. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p>
                You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy
                Policy are effective when they are posted on this page.
              </p>

              <h2>11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@tmcsystem.com" className="text-primary hover:underline">
                  privacy@tmcsystem.com
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            By using our Services, you acknowledge that you have read and understood this Privacy Policy and agree to
            its terms.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

