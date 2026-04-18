import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Zap,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock3,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  PlayCircle,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Brain,
  Instagram,
  Linkedin,
  ShieldAlert,
} from "lucide-react";
import SchedoraLogo from "@/components/SchedoraLogo";

const FEATURE_CARDS = [
  {
    icon: Calendar,
    title: "Schedule in one place",
    copy: "Plan posts across Instagram and LinkedIn without juggling tabs, reminders, or spreadsheets.",
  },
  {
    icon: Brain,
    title: "Improve captions with AI",
    copy: "Turn rough drafts into clean, platform-ready posts without losing your voice.",
  },
  {
    icon: FileSpreadsheet,
    title: "Bulk workflows",
    copy: "Use manual editor and CSV upload flows to queue posts faster when you are planning in batches.",
  },
  {
    icon: BarChart3,
    title: "See what is working",
    copy: "Track engagement, identify patterns, and make better posting decisions with fewer guesses.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Capture the idea",
    copy: "Start with a draft, a rough note, or a caption idea you already had in mind.",
  },
  {
    step: "02",
    title: "Refine with AI",
    copy: "Polish the copy, tighten the hook, and adapt it for the platform you are posting to.",
  },
  {
    step: "03",
    title: "Attach media",
    copy: "Add images, keep them organized, and avoid URL headaches during upload.",
  },
  {
    step: "04",
    title: "Schedule and move on",
    copy: "Lock in a time, publish on schedule, and get back to work instead of babysitting posts.",
  },
];

const COMPARISONS = [
  {
    name: "Buffer",
    summary: "Simple scheduling and a clean workflow.",
    edge: "Schedora adds a more AI-first content flow.",
  },
  {
    name: "Hootsuite",
    summary: "Powerful for bigger teams and broad social ops.",
    edge: "Schedora stays lighter for creators and small businesses.",
  },
  {
    name: "Later",
    summary: "Strong for visual planning and Instagram-first teams.",
    edge: "Schedora puts creation, editing, and publishing closer together.",
  },
];

const FAQS = [
  {
    q: "What is Schedora?",
    a: "Schedora is an AI-powered social media scheduling and content automation platform for creators, educators, and small businesses.",
  },
  {
    q: "Which platforms does it support?",
    a: "Schedora is built around Instagram and LinkedIn workflows today, with more channels in the product roadmap.",
  },
  {
    q: "Can I use Schedora as a Buffer alternative?",
    a: "Yes. Schedora is positioned as a simpler, AI-assisted scheduling workflow for teams that want creation and publishing in one place.",
  },
  {
    q: "Does Schedora help with content creation?",
    a: "Yes. It includes AI caption improvement and fast draft-to-schedule flows so you can create posts more quickly.",
  },
  {
    q: "Is Schedora good for small teams?",
    a: "Yes. It is designed for users who want clarity, speed, and fewer tools in the workflow.",
  },
];

function useLandingSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Schedora | AI Social Media Scheduling Tool";

    const metaPairs = [
      ["description", "Plan, write, and schedule social posts faster with Schedora, the AI-powered content automation platform for creators and small businesses."],
      ["robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"],
      ["og:title", "Schedora | AI Social Media Scheduling Tool"],
      ["og:description", "Plan, write, and schedule social posts faster with Schedora, the AI-powered content automation platform for creators and small businesses."],
      ["og:type", "website"],
      ["twitter:card", "summary_large_image"],
      ["twitter:title", "Schedora | AI Social Media Scheduling Tool"],
      ["twitter:description", "Plan, write, and schedule social posts faster with Schedora, the AI-powered content automation platform for creators and small businesses."],
    ];

    const created = [];
    metaPairs.forEach(([name, content]) => {
      let selector = name.startsWith("og:") || name.startsWith("twitter:") ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) {
          tag.setAttribute("property", name);
        } else {
          tag.setAttribute("name", name);
        }
        document.head.appendChild(tag);
        created.push(tag);
      }
      tag.setAttribute("content", content);
    });

    const canonicalHref = window.location.href.split("?")[0];
    let canonical = document.head.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute("href");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
      created.push(canonical);
    }
    canonical.setAttribute("href", canonicalHref);

    const existingSchema = document.getElementById("landing-schema");
    const prevSchema = existingSchema?.textContent;
    if (!existingSchema) {
      const schemaScript = document.createElement("script");
      schemaScript.type = "application/ld+json";
      schemaScript.id = "landing-schema";
      document.head.appendChild(schemaScript);
      created.push(schemaScript);
    }

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: "Schedora",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: "AI-powered social media scheduling and content automation platform.",
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
          })),
        },
      ],
    };
    document.getElementById("landing-schema").textContent = JSON.stringify(schema);

    return () => {
      document.title = prevTitle;
      created.forEach((node) => node.remove());
      if (canonical && prevCanonical) canonical.setAttribute("href", prevCanonical);
      if (existingSchema && prevSchema) existingSchema.textContent = prevSchema;
      if (!existingSchema) document.getElementById("landing-schema")?.remove();
    };
  }, []);
}

export default function Landing() {
  const navigate = useNavigate();
  useLandingSeo();

  return (
    <div id="top" className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b-2 border-black/10 bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <SchedoraLogo size="sm" />
          </a>

          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden sm:inline text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
              Compare
            </a>
            <button
              onClick={() => navigate("/login")}
              className="brutal-button bg-primary text-white rounded-xl"
              data-testid="header-login-button"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,255,51,0.35),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,69,0,0.14),_transparent_24%),linear-gradient(180deg,_rgba(244,243,237,0)_0%,_rgba(244,243,237,1)_100%)]" />
          <div className="container mx-auto grid gap-12 px-6 py-16 md:py-24 lg:grid-cols-2 lg:items-center relative">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] shadow-brutal">
                <Sparkles className="h-4 w-4 text-primary" />
                Built for creators, educators, and small businesses
              </div>

              <div className="mt-6">
                <SchedoraLogo size="lg" />
              </div>

              <h1 className="mt-6 text-5xl font-black font-heading tracking-tighter sm:text-6xl lg:text-7xl text-balance">
                Plan, write, and schedule social posts faster with AI.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
                Schedora is the social media scheduling tool that turns content ideas into published posts without the spreadsheet chaos, copy-paste loops, or last-minute panic.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/login")}
                  className="brutal-button bg-primary text-white rounded-xl text-sm sm:text-base"
                  data-testid="hero-cta-button"
                >
                  Start Free
                </button>
                <a
                  href="#how-it-works"
                  className="brutal-button bg-white text-text-primary rounded-xl text-sm sm:text-base inline-flex items-center justify-center gap-2"
                >
                  See How It Works <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-text-secondary">
                {[
                  "AI caption improvement",
                  "Instagram and LinkedIn scheduling",
                  "Bulk upload workflows",
                  "Cleaner content planning",
                ].map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-2 shadow-brutal">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Time to first post", value: "10 min" },
                  { label: "Core platforms", value: "IG + LinkedIn" },
                  { label: "Workflow", value: "Plan to publish" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border-2 border-black bg-white p-4 shadow-brutal">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{item.label}</div>
                    <div className="mt-2 text-lg font-black font-heading">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-10 hidden h-24 w-24 rounded-full bg-pastel-blue/40 blur-2xl lg:block" />
              <div className="absolute -right-6 bottom-10 hidden h-24 w-24 rounded-full bg-pastel-pink/40 blur-2xl lg:block" />
              <div className="relative rounded-xl border-4 border-black bg-white p-4 shadow-brutal-lg">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.24em] text-text-muted">Live preview</div>
                    <div className="text-xl font-black font-heading">Content workspace</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-aiAccent px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                    <PlayCircle className="h-4 w-4" />
                    Ready
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border-2 border-black bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                      <Layers3 className="h-4 w-4" /> Draft queue
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                        <div className="text-sm font-black">Improve the reach of this launch post</div>
                        <div className="mt-1 text-xs text-text-muted">AI suggested CTA + platform edit</div>
                      </div>
                      <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                        <div className="text-sm font-black">Instagram caption for the feature drop</div>
                        <div className="mt-1 text-xs text-text-muted">Ready for scheduling</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-black bg-aiAccent/25 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                      <TrendingUp className="h-4 w-4" /> Publishing signals
                    </div>
                    <div className="mt-3 space-y-3">
                      {[
                        { label: "Scheduled", value: "12" },
                        { label: "Published", value: "84" },
                        { label: "AI improved", value: "29" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{item.label}</div>
                          <div className="mt-1 text-2xl font-black font-heading">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">The problem</div>
            <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Social media work is still too fragmented.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              Most teams are not struggling because they lack ideas. They are struggling because the workflow is split across too many tools.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: MessageSquareText,
                title: "Ideas live in one place",
                copy: "Drafts often start in notes or docs and never make it cleanly into a publishing flow.",
              },
              {
                icon: ShieldAlert,
                title: "Scheduling lives somewhere else",
                copy: "When publishing happens in another tool, it is easy to lose momentum or miss the timing.",
              },
              {
                icon: Clock3,
                title: "Every extra step costs time",
                copy: "Copy-paste loops and manual cleanup create friction that compounds every week.",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="brutal-card p-6">
                  <Icon className="h-7 w-7 text-primary" />
                  <h3 className="mt-4 text-xl font-black font-heading">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">{card.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">The solution</div>
              <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
                Schedora brings the whole workflow into one fast path.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                Create, refine, schedule, and review content without jumping between disconnected tools.
              </p>

              <div className="mt-8 space-y-4">
                {FEATURE_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="brutal-card p-5">
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black font-heading">{card.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{card.copy}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border-4 border-black bg-aiAccent p-6 shadow-brutal-lg">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                <Zap className="h-4 w-4" /> How teams use it
              </div>
              <div className="mt-5 grid gap-4">
                {WORKFLOW_STEPS.map((item) => (
                  <div key={item.step} className="rounded-xl border-2 border-black bg-white p-4 shadow-brutal">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl border-2 border-black bg-primary px-3 py-2 text-sm font-black text-white shadow-brutal">
                        {item.step}
                      </div>
                      <div>
                        <div className="text-lg font-black font-heading">{item.title}</div>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Comparison</div>
            <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Buffer, Hootsuite, Later, or Schedora?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              Each tool has a place. Schedora is for teams that want a tighter loop between writing, planning, and publishing.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {COMPARISONS.map((item) => (
              <div key={item.name} className="brutal-card p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">{item.name}</div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.summary}</p>
                <div className="mt-5 rounded-xl border-2 border-black bg-background p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Why people look at Schedora</div>
                  <p className="mt-2 text-sm font-bold leading-relaxed">{item.edge}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="rounded-xl border-4 border-black bg-white p-8 shadow-brutal-lg">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Built for growth</div>
                <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
                  Made for creators, educators, and small teams who need consistency.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                  Schedora is designed to help you move faster without adding complexity. That makes it useful whether you post once a week or every day.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { icon: Instagram, label: "Creators", copy: "Ship more content with less friction." },
                  { icon: Linkedin, label: "Educators", copy: "Build authority with consistent posts." },
                  { icon: Users, label: "Small businesses", copy: "Keep marketing moving without a large team." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border-2 border-black bg-background p-4 shadow-brutal">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-lg font-black font-heading">{item.label}</div>
                          <p className="text-sm text-text-secondary">{item.copy}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">FAQ</div>
            <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Questions people ask before they switch.
            </h2>
          </div>

          <div className="mt-10 grid gap-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="brutal-card p-5 group">
                <summary className="cursor-pointer list-none text-lg font-black font-heading flex items-center justify-between gap-4">
                  {faq.q}
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="rounded-xl border-4 border-black bg-aiAccent p-8 text-center shadow-brutal-lg">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] shadow-brutal">
              <ShieldCheck className="h-4 w-4" />
              Launch-ready workflow
            </div>
            <h2 className="mt-5 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Start scheduling without the chaos.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary">
              If you want one place to create, improve, plan, and publish social posts, Schedora is ready.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/login")}
                className="brutal-button bg-primary text-white rounded-xl"
                data-testid="footer-cta-button"
              >
                Start Free
              </button>
              <a href="#top" className="brutal-button bg-white text-text-primary rounded-xl inline-flex items-center justify-center gap-2">
                Back to top <ArrowRight className="h-4 w-4 rotate-[-90deg]" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-surface py-8">
        <div className="container mx-auto flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">
            © 2026 Schedora. Built for creators who want to ship faster.
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-xs text-text-muted hover:text-text-primary transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-xs text-text-muted hover:text-text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
