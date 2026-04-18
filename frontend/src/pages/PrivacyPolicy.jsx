import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background" data-testid="privacy-page">
      <header className="border-b-2 border-border bg-surface sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black font-heading tracking-tighter cursor-pointer" onClick={() => navigate("/")}>Schedora</h1>
          <button onClick={() => navigate("/login")} className="brutal-button bg-primary text-white">Login</button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" /> Back</button>

        <h1 className="text-4xl sm:text-5xl font-black font-heading tracking-tighter mb-8">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: April 17, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">1. Introduction</h2>
            <p>Schedora ("we", "our", "us") operates the social media scheduling platform at schedora.com. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">2. Information We Collect</h2>
            <p className="mb-2"><strong>Account Information:</strong> When you register, we collect your name, email address, and password (hashed). If you sign in via Google OAuth, we receive your name, email, and profile picture from Google.</p>
            <p className="mb-2"><strong>Social Media Data:</strong> When you connect social media accounts (Instagram, Facebook, Twitter/X, LinkedIn, YouTube), we store OAuth access tokens and refresh tokens to publish content on your behalf. We do not store your social media passwords.</p>
            <p className="mb-2"><strong>Content Data:</strong> We store the posts, captions, images, and videos you create and schedule through our platform.</p>
            <p><strong>Usage Data:</strong> We collect analytics about how you use Schedora, including pages visited, features used, and scheduling patterns to improve our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and maintain our scheduling service</li>
              <li>To publish content to your connected social media accounts at scheduled times</li>
              <li>To generate AI-powered content suggestions using anonymized prompts</li>
              <li>To send you notifications about post status (published, failed, retrying)</li>
              <li>To send weekly performance digests (if enabled in your settings)</li>
              <li>To improve our platform and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">4. Third-Party Services</h2>
            <p className="mb-2">We integrate with the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Meta (Facebook/Instagram):</strong> For publishing posts and retrieving analytics via Graph API</li>
              <li><strong>Twitter/X:</strong> For publishing tweets via Twitter API v2</li>
              <li><strong>LinkedIn:</strong> For publishing posts via LinkedIn Marketing API</li>
              <li><strong>YouTube (Google):</strong> For uploading videos via YouTube Data API v3</li>
              <li><strong>Google AI (Gemini):</strong> For AI content generation (no personal data is sent)</li>
              <li><strong>Resend:</strong> For sending transactional emails</li>
            </ul>
            <p className="mt-2">Each third-party service has its own privacy policy. We encourage you to review them.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">5. Data Storage & Security</h2>
            <p>Your data is stored in encrypted databases. Passwords are hashed using bcrypt. OAuth tokens are stored securely and used only for authorized publishing actions. We use JWT tokens for session management with automatic expiry.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">6. Data Retention & Deletion</h2>
            <p className="mb-2">We retain your data for as long as your account is active. You can request deletion of your account and all associated data at any time by:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Contacting us at privacy@schedora.com</li>
              <li>Using the account deletion feature in Settings</li>
            </ul>
            <p className="mt-2">Upon deletion, we remove all personal data, posts, connected account tokens, and analytics within 30 days. Some anonymized, aggregated data may be retained for service improvement.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Disconnect any social media account at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">8. Cookies</h2>
            <p>We use httpOnly cookies for authentication (JWT access and refresh tokens). We do not use third-party tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">9. Children's Privacy</h2>
            <p>Schedora is not intended for users under 13 years of age. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-heading text-text-primary mb-3">11. Contact Us</h2>
            <p>For privacy-related inquiries, contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> privacy@schedora.com</p>
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
