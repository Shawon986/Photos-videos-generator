import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  Cpu,
  Heart,
  Image as ImageIcon,
  Lock,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroArt } from "@/components/hero-art";

const FEATURES = [
  {
    icon: ImageIcon,
    title: "Text → Image",
    description:
      "Describe anything and turn it into artwork with Stable Diffusion, SDXL and Flux-compatible models.",
  },
  {
    icon: Clapperboard,
    title: "Text → Video",
    description:
      "Bring prompts to life with open video models like Wan, CogVideoX, HunyuanVideo and LTX-Video.",
  },
  {
    icon: Wand2,
    title: "Image → Video",
    description:
      "Upload a photo and animate it with cinematic camera moves and natural motion.",
  },
  {
    icon: Cpu,
    title: "Bring your own model",
    description:
      "Point VisionForge at your own GPU inference server — the app never locks you into one provider.",
  },
  {
    icon: Lock,
    title: "Private by default",
    description:
      "Your creations stay private until you choose to share them. No paywalls, no forced public galleries.",
  },
  {
    icon: Zap,
    title: "No subscription",
    description:
      "Free to use with open-source models. Generation limits protect the service, not your wallet.",
  },
];

const STEPS = [
  {
    title: "Describe your idea",
    description: "Type a prompt, tune the controls and pick a model.",
  },
  {
    title: "Watch it generate",
    description: "Track real progress — never fabricated percentages.",
  },
  {
    title: "Refine & share",
    description: "Regenerate, create variations, download or share publicly.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    highlight: true,
    features: [
      "AI image generation",
      "AI video generation",
      "Image-to-video animation",
      "Private generations",
      "Generation history",
      "Fair-use rate limits",
    ],
    cta: "Start Creating",
  },
  {
    name: "Self-hosted",
    price: "$0",
    period: "+ your hardware",
    highlight: false,
    features: [
      "Unlimited generations",
      "Your own GPU inference server",
      "Any compatible model (SDXL, Flux, Wan, CogVideoX…)",
      "Full data ownership",
      "Custom rate limits",
    ],
    cta: "Read the docs",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-ambient">
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="container grid items-center gap-12 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          <div className="max-w-xl">
            <Badge variant="outline" className="mb-5 gap-1.5 border-violet-400/30 text-violet-200">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Powered by open-source AI models
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Create stunning <span className="text-gradient">images and videos</span> with AI.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Turn your ideas into images and videos using powerful AI models — without
              expensive subscriptions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="gradient" size="lg" asChild>
                <Link href="/create">
                  Start Creating
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/explore">Explore Creations</Link>
              </Button>
            </div>
            <dl className="mt-10 flex gap-8 text-sm text-muted-foreground">
              <div>
                <dt className="sr-only">Models</dt>
                <dd className="font-display text-2xl font-bold text-foreground">10+</dd>
                <dd>open models supported</dd>
              </div>
              <div>
                <dt className="sr-only">Cost</dt>
                <dd className="font-display text-2xl font-bold text-foreground">$0</dd>
                <dd>subscription required</dd>
              </div>
              <div>
                <dt className="sr-only">Privacy</dt>
                <dd className="font-display text-2xl font-bold text-foreground">100%</dd>
                <dd>private by default</dd>
              </div>
            </dl>
          </div>

          <HeroArt />
        </div>
      </section>

      {/* ---------------------------- Features ---------------------------- */}
      <section className="border-t border-white/5 py-20" aria-labelledby="features-heading">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="features-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to <span className="text-gradient">create</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              A complete AI creative studio — designed around free and open-source models.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.04]"
              >
                <span className="mb-4 flex size-11 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 transition-colors group-hover:from-violet-600/40 group-hover:to-fuchsia-600/40">
                  <feature.icon className="h-5 w-5 text-violet-300" aria-hidden="true" />
                </span>
                <h3 className="font-display font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- How it works ------------------------- */}
      <section className="border-t border-white/5 py-20" aria-labelledby="how-heading">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 id="how-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From idea to artwork in <span className="text-gradient">three steps</span>
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              No sign-up friction, no subscription wall. Just describe, generate and refine.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/create">
                Open the studio
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 font-display text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------- Pricing ---------------------------- */}
      <section id="pricing" className="scroll-mt-20 border-t border-white/5 py-20" aria-labelledby="pricing-heading">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="pricing-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Free to <span className="text-gradient">create</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              VisionForge is free. Fair-use limits protect the service; self-hosting removes
              them entirely.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            {PRICING.map((tier) => (
              <div
                key={tier.name}
                className={
                  tier.highlight
                    ? "relative rounded-2xl border border-violet-400/40 bg-gradient-to-b from-violet-600/10 to-transparent p-7 shadow-2xl shadow-violet-500/10"
                    : "rounded-2xl border border-white/10 bg-white/[0.02] p-7"
                }
              >
                {tier.highlight ? (
                  <Badge className="absolute -top-3 left-6">Most popular</Badge>
                ) : null}
                <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                <p className="mt-2">
                  <span className="font-display text-4xl font-bold">{tier.price}</span>{" "}
                  <span className="text-sm text-muted-foreground">/ {tier.period}</span>
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Heart
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={tier.highlight ? "gradient" : "outline"}
                  className="mt-6 w-full"
                  asChild
                >
                  <Link href={tier.highlight ? "/create" : "/#about"}>{tier.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ About ----------------------------- */}
      <section id="about" className="scroll-mt-20 border-t border-white/5 py-20" aria-labelledby="about-heading">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 id="about-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            About <span className="text-gradient">VisionForge AI</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            VisionForge is a self-hostable AI creative studio built on open-source models.
            Connect a local GPU inference server running Stable Diffusion, Flux, Wan,
            CogVideoX, HunyuanVideo or LTX-Video — or use the Hugging Face free inference
            tier — and start creating. Your data stays yours: generations are private by
            default and the whole stack runs on hardware you control.
          </p>
          <p className="mt-3 text-muted-foreground">
            The application is provider-agnostic by design: image and video providers plug
            in behind a clean interface, so the app can never be locked to one vendor.
          </p>
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------ */}
      <section className="border-t border-white/5 py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/60 via-zinc-950 to-fuchsia-950/40 px-6 py-16 text-center">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to create something <span className="text-gradient">beautiful</span>?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
              Join the studio — free, open and yours to control.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="gradient" size="lg" asChild>
                <Link href="/create">
                  Start Creating
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/explore">Explore Creations</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
