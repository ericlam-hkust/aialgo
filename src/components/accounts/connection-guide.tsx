import { BookOpen, Download, ExternalLink } from "lucide-react";
import { LINKING_MODES, type AccountProviderMeta } from "@/lib/trading-accounts";
import { cn } from "@/lib/utils";


type Props = { meta: AccountProviderMeta; className?: string };

function GuideLink({ href, icon: Icon, label }: { href: string; icon: typeof BookOpen; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
      <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
    </a>
  );
}

export function ConnectionGuide({ meta, className }: Props) {
  const mode = LINKING_MODES[meta.linking];
  return (
    <section className={cn("rounded-md border border-border/70 bg-muted/30 p-3", className)}>
      <h3 className="text-sm font-medium">How to link {meta.label}</h3>
      <p className={cn("mt-1 inline-flex rounded border px-1.5 py-0.5 text-[11px]", mode.tone)}>{mode.label}</p>
      <p className="mt-2 text-xs text-muted-foreground">{mode.hint}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
        {meta.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {meta.docsUrl ? <GuideLink href={meta.docsUrl} icon={BookOpen} label="Broker docs" /> : null}
        {meta.downloadUrl ? <GuideLink href={meta.downloadUrl} icon={Download} label="Gateway download" /> : null}
      </div>
      {meta.unverifiedProgram ? (
        <p className="mt-2 text-xs text-warning">
          Read-only linking for this broker is pending verification of its partner program terms. Until then the local
          agent is the supported path.
        </p>
      ) : null}
    </section>
  );
}

