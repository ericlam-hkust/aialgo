import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Check,
  Gift,
  LineChart,
  ShieldCheck,
  Store,
  TrendingUp,
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
import {
  BASE_COMMISSION,
  BATCH_RULE_COPY,
  CONSUMER_PLANS,
  CONTRIBUTOR_PROMISE,
  FEE_MAX_PCT,
  FEE_MIN_PCT,
  MICRO_PROFIT_THRESHOLD,
  WATERMARK_EXAMPLE,
} from "@/lib/monetization";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "aiAlgo — Free to build, $12 to go live, fees only on wins" },
      {
        name: "description",
        content:
          "Browse and paper trade AI models and algo strategies for free. Live execution is $12/month plus a performance fee charged only on profitable closed trades. Creators pay nothing and keep 80%.",
      },
      { property: "og:title", content: "aiAlgo — Pay only on winning trades" },
      {
        property: "og:description",
        content:
          "A marketplace of validated AI models and algo strategies. Free to build and paper trade, $12/month to go live, performance fees only on wins.",
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

const PROOFS = [
  { icon: BadgeCheck, key: "verified" },
  { icon: TrendingUp, key: "watermark" },
  { icon: ShieldCheck, key: "nolosses" },
  { icon: Gift, key: "creatorsfree" },
] as const;

const STEPS = ["s1", "s2", "s3"] as const;
const FAQS = ["1", "2", "3", "4", "5"] as const;

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
            aiAlgo
          </span>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/models">{t("landing.nav.marketplace")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/pricing">{t("landing.nav.pricing")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/creators">{t("landing.nav.creators")}</Link>
            </Button>
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
              <Link to="/models">{t("landing.ctaSecondary")}</Link>
            </Button>
          </div>
          <dl className="mx-auto mt-14 grid max-w-4xl gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            {PROOFS.map((p) => (
              <div key={p.key} className="flex gap-3">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-sm font-semibold">{t(`landing.proof.${p.key}.title`)}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{t(`landing.proof.${p.key}.body`)}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          {(["traders", "creators"] as const).map((audience) => (
            <div key={audience}>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {t(`landing.${audience}.title`)}
              </h2>
              <p className="mt-2 text-muted-foreground">{t(`landing.${audience}.body`)}</p>
              <ol className="mt-6 space-y-4">
                {STEPS.map((s) => (
                  <li key={s}>
                    <Card className="border-border/70 bg-card/70">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-semibold">{t(`landing.${audience}.${s}.title`)}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {t(`landing.${audience}.${s}.body`)}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ol>
              {audience === "creators" ? (
                <p className="mt-4 text-xs text-muted-foreground">{CONTRIBUTOR_PROMISE}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {t("landing.pricingTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            {t("landing.pricingBody")}
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {CONSUMER_PLANS.map((plan) => (
              <Card
                key={plan.key}
                className={plan.key === "basic" ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border/70"}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.key === "basic" ? <Badge>{t("landing.mostPopular")}</Badge> : null}
                  </div>
                  <p className="mono mt-4 text-3xl font-semibold">
                    ${plan.monthly}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {t("landing.perMonth")}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-6 w-full"
                    variant={plan.key === "basic" ? "default" : "outline"}
                  >
                    <Link to="/auth/register">
                      {plan.key === "basic" ? t("landing.plan.basic.cta") : t("landing.plan.free.cta")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card className="border-border/70">
              <CardContent className="p-6">
                <h3 className="font-semibold">{t("landing.fee.title")}</h3>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      {FEE_MIN_PCT}–{FEE_MAX_PCT}% of net profit on a winning closed trade, split{" "}
                      {Math.round((1 - BASE_COMMISSION) * 100)}/{Math.round(BASE_COMMISSION * 100)} between the
                      creator and the platform. Profits under ${MICRO_PROFIT_THRESHOLD} are exempt.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{WATERMARK_EXAMPLE}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{BATCH_RULE_COPY}</span>
                  </li>
                </ul>
                <Button asChild variant="ghost" className="mt-6 w-full">
                  <Link to="/pricing">
                    {t("landing.fee.cta")} <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Badge className="mb-4" variant="secondary">
          {t("landing.trust.badge")}
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("landing.trust.title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("landing.trust.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/how-we-make-money">{t("landing.trust.link1")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/models/verification">{t("landing.trust.link2")}</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
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
