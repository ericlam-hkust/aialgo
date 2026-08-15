import { BookOpen, Download, ExternalLink, KeyRound } from "lucide-react";
import type { AccountProviderMeta } from "@/lib/trading-accounts";
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
  return (
    <section className={cn("rounded-md border border-border/70 bg-muted/30 p-3", className)}>
      <h3 className="text-sm font-medium">How to connect {meta.label}</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
        {meta.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {meta.docsUrl ? <GuideLink href={meta.docsUrl} icon={BookOpen} label="API docs" /> : null}
        {meta.keysUrl ? <GuideLink href={meta.keysUrl} icon={KeyRound} label="Create keys" /> : null}
        {meta.downloadUrl ? <GuideLink href={meta.downloadUrl} icon={Download} label="Gateway download" /> : null}
      </div>
      {meta.permissionNote ? <p className="mt-2 text-xs text-muted-foreground">{meta.permissionNote}</p> : null}
    </section>
  );
}
