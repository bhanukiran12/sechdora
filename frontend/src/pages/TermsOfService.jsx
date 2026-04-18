import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background" data-testid="terms-page">
      <header className="border-b-2 border-border bg-surface sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black font-heading tracking-tighter cursor-pointer" onClick={() => navigate("/")}>Schedora</h1>
          <button onClick={() => navigate("/login")} className="brutal-button bg-primary text-white">Login</button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" /> Back</button>

        <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-8">Terms of Service</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: April 17, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Schedora ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">2. Description of Service</h2>
            <p>Schedora is a social media scheduling platform that allows users to create, schedule, and publish content across multiple social media platforms including Instagram, Facebook, Twitter/X, LinkedIn, and YouTube. The Service includes AI-powered content generation, analytics, and team collaboration features.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 13 years old to use the Service</li>
              <li>One person may not maintain more than one account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">4. User Content</h2>
            <p className="mb-2">You retain ownership of all content you create and publish through Schedora. By using the Service, you grant us a limited license to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Store and process your content for scheduling and publishing</li>
              <li>Display your content within the Schedora platform</li>
              <li>Transmit your content to connected social media platforms on your behalf</li>
            </ul>
            <p className="mt-2">You are solely responsible for the content you publish. Content must comply with the terms of service of each connected social media platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">5. Prohibited Uses</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Violating any applicable laws or regulations</li>
              <li>Publishing spam, misleading, or harmful content</li>
              <li>Attempting to gain unauthorized access to other accounts</li>
              <li>Interfering with or disrupting the Service</li>
              <li>Using the Service to harass, abuse, or harm others</li>
              <li>Reverse engineering or attempting to extract source code</li>
              <li>Using automated tools to access the Service beyond its intended API</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">6. Social Media Platform Compliance</h2>
            <p>You are responsible for complying with the terms of service, community guidelines, and rate limits of each social media platform you connect. Schedora is not liable for account suspensions or restrictions imposed by third-party platforms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">7. AI-Generated Content</h2>
            <p>Schedora offers AI-powered content suggestions. AI-generated content is provided as-is and you are responsible for reviewing and approving all content before publishing. We do not guarantee the accuracy, originality, or appropriateness of AI suggestions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">8. Service Availability</h2>
            <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We are not liable for failed post deliveries due to third-party platform outages, API changes, or token expiry.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">9. Limitation of Liability</h2>
            <p>Schedora is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to lost revenue from failed posts or account restrictions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">11. Changes to Terms</h2>
            <p>We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance. We will notify you of significant changes via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">12. Contact</h2>
            <p><strong>Email:</strong> legal@schedora.com</p>
            <p><strong>Company:</strong> Schedora</p>
          </section>
        </div>
      </main>

      <footer className="border-t-2 border-border bg-surface py-6 mt-12">
        <div className="container mx-auto px-6 text-center text-text-muted text-xs tracking-[0.2em] uppercase font-bold">
          &copy; 2026 Schedora. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
