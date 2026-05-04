import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Users,
  FileSpreadsheet,
  Brain,
  Briefcase,
  Coins,
  XCircle,
  Clock3,
} from "lucide-react";
import SchedoraLogo from "@/components/SchedoraLogo";

const FEATURE_CARDS = [
  {
    icon: Brain,
    title: "AI Assistance",
    copy: "Generate drafts, hooks, and structured content ideas with AI-assisted tools.",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    copy: "Plan and publish posts at selected times across supported platforms.",
  },
  {
    icon: FileSpreadsheet,
    title: "Bulk Upload",
    copy: "Create multiple posts or jobs using a manual editor or CSV import.",
  },
  {
    icon: Briefcase,
    title: "Job Workflow",
    copy: "Create and manage job posts in a structured, organized format.",
  },
  {
    icon: Coins,
    title: "Token System",
    copy: "Use credits based on actions, giving you flexible control over usage.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Create or import content",
    copy: "Bring in an existing draft or start from a blank post inside Schedora.",
  },
  {
    step: "02",
    title: "Edit or generate drafts using AI",
    copy: "Refine the wording, generate alternatives, or polish the structure with AI assistance.",
  },
  {
    step: "03",
    title: "Schedule posts or manage workflows",
    copy: "Publish on a chosen schedule or organize ongoing job and outreach workflows.",
  },
];

const HELPS_WITH = [
  "Organizing content workflows",
  "Drafting posts efficiently",
  "Managing job-related tasks",
];

const DOES_NOT_DO = [
  "Does not guarantee engagement or reach",
  "Does not replace human strategy",
  "Does not automate unsolicited outreach",
];

const FAQS = [
  {
    q: "What is Schedora?",
    a: "Schedora is a structured workflow platform that helps you draft content, schedule posts, and manage job-related workflows in one place.",
  },
  {
    q: "Which platforms does it support?",
    a: "Schedora supports posting to major social platforms such as LinkedIn and X today, with team organization features available separately.",
  },
  {
    q: "How does the token system work?",
    a: "Most actions in Schedora — like generating an AI draft, scheduling a post, or exporting a job — use a small number of credits. This keeps usage flexible and predictable.",
  },
  {
    q: "Does Schedora help with content creation?",
    a: "Yes. Schedora includes AI-assisted drafting, hook ideas, and structured content suggestions to help you write posts faster.",
  },
  {
    q: "Is Schedora suitable for small teams?",
    a: "Yes. Ultra Pro is designed for productivity and advanced workflows, while Organization is kept separate for team structure and access control.",
  },
];

function useLandingSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Schedora | Structured workflows for content and outreach";

    const description = "Schedora is a structured workflow platform for content and outreach. Draft posts, schedule them, and organize workflows with AI-assisted tools.";

    const metaPairs = [
      ["description", description],
      ["robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"],
      ["og:title", "Schedora | Structured workflows for content and outreach"],
      ["og:description", description],
      ["og:type", "website"],
      ["twitter:card", "summary_large_image"],
      ["twitter:title", "Schedora | Structured workflows for content and outreach"],
      ["twitter:description", description],
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
          applicationCategory: "WebApplication",
          operatingSystem: "Web",
          description: "Structured workflow platform for content and outreach.",
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
            <a href="#features" className="hidden sm:inline text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
              Features
            </a>
            <button
              onClick={() => navigate("/pricing")}
              className="hidden sm:inline-flex brutal-button bg-white text-text-primary rounded-xl text-sm"
            >
              View Plans
            </button>
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
                Structured workflows for content and outreach
              </div>

              <div className="mt-6">
                <SchedoraLogo size="lg" />
              </div>

              <h1 className="mt-6 text-5xl font-black font-heading tracking-tighter sm:text-6xl lg:text-7xl text-balance">
                Bring structure to your content and outreach.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
                Draft posts, schedule them, and organize your workflows with AI-assisted tools.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/login")}
                  className="brutal-button bg-primary text-white rounded-xl text-sm sm:text-base"
                  data-testid="hero-cta-button"
                >
                  Start Free
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className="brutal-button bg-white text-text-primary rounded-xl text-sm sm:text-base inline-flex items-center justify-center gap-2"
                  data-testid="hero-view-plans"
                >
                  View Plans <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-text-secondary">
                {[
                  "AI-assisted drafting",
                  "Scheduling across platforms",
                  "Bulk post and job workflows",
                  "Token-based usage control",
                ].map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-2 shadow-brutal">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
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
                    <div className="text-xs font-black uppercase tracking-[0.24em] text-text-muted">Workspace preview</div>
                    <div className="text-xl font-black font-heading">Content workflow</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-aiAccent px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Sparkles className="h-4 w-4" />
                    AI assisted
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border-2 border-black bg-background p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                      <Layers3 className="h-4 w-4" /> Draft queue
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                        <div className="text-sm font-black">Launch announcement</div>
                        <div className="mt-1 text-xs text-text-muted">Draft · AI suggestions ready</div>
                      </div>
                      <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                        <div className="text-sm font-black">Feature update caption</div>
                        <div className="mt-1 text-xs text-text-muted">Ready to schedule</div>
                      </div>
                      <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                        <div className="text-sm font-black">Senior Designer · Job post</div>
                        <div className="mt-1 text-xs text-text-muted">Workflow in review</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-black bg-aiAccent/25 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                      <Calendar className="h-4 w-4" /> This week
                    </div>
                    <div className="mt-3 space-y-3">
                      {[
                        { label: "Drafts", state: "In progress" },
                        { label: "Scheduled", state: "Queued" },
                        { label: "Job workflows", state: "Active" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{item.label}</div>
                          <div className="mt-1 text-base font-black font-heading">{item.state}</div>
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
              Content and outreach work spreads across too many tools.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              When drafts, schedules, and outreach live in separate places, it becomes harder to stay consistent and easy to lose track of what is happening.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                icon: MessageSquareText,
                title: "Managing posts and outreach across tools can become messy.",
                copy: "Drafts in one place, scheduling in another, and outreach in a third makes the process fragile and slow.",
              },
              {
                icon: Clock3,
                title: "Consistency is difficult without a structured system.",
                copy: "Without a clear workflow, posting and follow-ups depend on memory and ad-hoc effort instead of a repeatable process.",
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

        <section id="features" className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">The solution</div>
            <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Schedora helps you bring structure to how you create, schedule, and manage content and job-related workflows.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="brutal-card p-6">
                  <div className="rounded-xl border-2 border-black bg-white p-3 shadow-brutal w-fit">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-black font-heading">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{card.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">How it works</div>
            <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              A simple three-step workflow.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {WORKFLOW_STEPS.map((item) => (
              <div key={item.step} className="brutal-card p-6">
                <div className="rounded-xl border-2 border-black bg-primary px-3 py-2 text-sm font-black text-white shadow-brutal w-fit">
                  {item.step}
                </div>
                <div className="mt-4 text-lg font-black font-heading">{item.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Transparency</div>
            <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Clear about what Schedora does — and what it does not do.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              We want you to choose Schedora with the right expectations.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="brutal-card p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                <ShieldCheck className="h-4 w-4 text-green-600" /> What Schedora helps with
              </div>
              <ul className="mt-4 space-y-3">
                {HELPS_WITH.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-bold leading-relaxed">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" strokeWidth={3} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="brutal-card p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-text-muted">
                <XCircle className="h-4 w-4 text-text-secondary" /> What Schedora does not do
              </div>
              <ul className="mt-4 space-y-3">
                {DOES_NOT_DO.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-bold leading-relaxed text-text-secondary">
                    <XCircle className="h-5 w-5 text-text-muted shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="who-its-for" className="container mx-auto px-6 py-16">
          <div className="rounded-xl border-4 border-black bg-white p-8 shadow-brutal-lg">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Who it's for</div>
                <h2 className="mt-3 text-3xl font-black font-heading tracking-tight sm:text-4xl">
                  Built for people who want consistency and control.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                  Schedora suits professionals, recruiters, founders, and freelancers who manage content and outreach as part of their week.
                </p>
              </div>
              <div className="grid gap-4">
                {[
                  { icon: Sparkles, label: "Professionals", copy: "Build presence on social platforms with a steady rhythm." },
                  { icon: Briefcase, label: "Recruiters", copy: "Manage job posts and candidate workflows in one place." },
                  { icon: Users, label: "Founders & freelancers", copy: "Handle content and outreach without juggling extra tools." },
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
              Common questions.
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
              Start with the Free plan
            </div>
            <h2 className="mt-5 text-3xl font-black font-heading tracking-tight sm:text-4xl">
              Bring structure to your content and outreach.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary">
              Try Schedora for free. Upgrade when your usage or team grows.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/login")}
                className="brutal-button bg-primary text-white rounded-xl"
                data-testid="footer-cta-button"
              >
                Start Free
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="brutal-button bg-white text-text-primary rounded-xl inline-flex items-center justify-center gap-2"
                data-testid="footer-view-plans"
              >
                View Plans <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-surface py-8">
        <div className="container mx-auto flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">
            © 2026 Schedora. Structured workflows for content and outreach.
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
