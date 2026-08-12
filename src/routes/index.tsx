import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  LineChart,
  ShieldCheck,
  Store,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlgoForge — No-Code Algorithmic Trading for HK & US Markets" },
      {
        name: "description",
        content:
          "Build, backtest and paper-trade automated strategies without code. Visual builder, AI assist and realistic HK/US market simulation.",
      },
      { property: "og:title", content: "AlgoForge — No-Code Algorithmic Trading" },
      {
        property: "og:description",
        content:
          "Design trading strategies visually, backtest them on two years of HK and US market data, and run them in paper trading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Workflow, key: "builder" },
  { icon: BrainCircuit, key: "ai" },
  { icon: LineChart, key: "backtest" },
  { icon: Activity, key: "paper" },
  { icon: ShieldCheck, key: "risk" },
  { icon: Store, key: "market" },
] as const;

const PRICING = [
  { name: "Free", price: "HK$0", key: "free", period: "landing.plan.free.period", highlight: false },
  { name: "Pro", price: "HK$299", key: "pro", period: "landing.plan.paid.period", highlight: true },
  { name: "Elite", price: "HK$799", key: "elite", period: "landing.plan.paid.period", highlight: false },
] as const;

const FAQS = ["1", "2", "3", "4"] as const;

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (

    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Workflow className="h-4 w-4" aria-hidden />
            </span>
            AlgoForge
          </span>
          <nav className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth/login">{t("landing.signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth/register">{t("landing.getStarted")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="hero-glow relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center md:py-32">
          <Badge variant="outline" className="mb-6 border-primary/40 text-primary">
            {t("landing.badge")}
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            {t("landing.heroBody")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth/register">
                {t("landing.ctaPrimary")} <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth/login">{t("landing.ctaSecondary")}</Link>
            </Button>
          </div>
          <dl className="mono mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-6 text-left sm:grid-cols-4">
            {[
              ["9", "landing.stat.symbols"],
              ["2yr", "landing.stat.history"],
              ["30+", "landing.stat.nodes"],
              ["<5s", "landing.stat.backtest"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-2xl font-semibold text-foreground">{v}</dt>
                <dd className="text-xs tracking-wide text-muted-foreground uppercase">{t(l!)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("landing.featuresTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("landing.featuresBody")}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.key} className="border-border/70 bg-card/70">
              <CardContent className="p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold">{t(`landing.feature.${f.key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`landing.feature.${f.key}.body`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{t("landing.pricingTitle")}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PRICING.map((p) => (
              <Card
                key={p.name}
                className={p.highlight ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border/70"}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.highlight ? <Badge>{t("landing.mostPopular")}</Badge> : null}
                  </div>
                  <p className="mono mt-4 text-3xl font-semibold">
                    {p.price}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {t("landing.perPeriod", { period: t(p.period) })}
                    </span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {["f1", "f2", "f3", "f4"].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                        {t(`landing.plan.${p.key}.${f}`)}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                    <Link to="/auth/register">{t(`landing.plan.${p.key}.cta`)}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("landing.faqTitle")}</h2>
        <Accordion type="single" collapsible className="mt-6">
          {FAQS.map((n) => (
            <AccordionItem key={n} value={n}>
              <AccordionTrigger className="text-left text-sm">{t(`landing.faq.q${n}`)}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {t(`landing.faq.a${n}`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}
