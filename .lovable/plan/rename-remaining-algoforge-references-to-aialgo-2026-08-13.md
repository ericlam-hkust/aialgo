# Rename remaining "AlgoForge" references to "aiAlgo"

73 occurrences of "AlgoForge" remain across 35 files while the rest of the app already uses "aiAlgo". This plan replaces the user-visible ones.

## What changes

1. **Page titles and social metadata** — every route `head()` still ending in "— AlgoForge": marketplace index, model detail, compare, docs, data library, API status, auth login/register, onboarding, billing, earnings, accounts, execution, data sources, templates, builder, admin revenue, strategy listing wizard.
2. **Visible brand marks** — marketplace public header, auth layout wordmark, sidebar wordmark and footer in the app shell, "Enter AlgoForge" onboarding button.
3. **In-app copy** — AI assistant greeting, teams invite copy ("No aiAlgo account uses that email yet", "They need an aiAlgo account"), brokers panel note, trust-badge hint, trading-account labels ("aiAlgo Paper Account", IP-restriction tip), data source labels ("aiAlgo platform market data") in the listing wizard, marketplace detail and backtest validation default.
4. **AI system prompts** — assistant and strategy-compiler prompts refer to the platform by name.
5. **Generated Python header comment** in the codegen output.
6. **Design-system comment** in `src/styles.css` and the project `README.md` intro line.

## Not changed

- Archived plan documents under `.lovable/plan/` (historical records).

## Also renamed (non-visible parts)

- **Historical migration files** are left as-is (already applied), but a new migration updates existing rows: `strategy_templates.provider = 'AlgoForge'` becomes `'aiAlgo'`, and any stored `data_source_label` values containing "AlgoForge" are rewritten to "aiAlgo".
- Comments, system prompts, generated code headers, README text, and any other internal string containing "AlgoForge".

## Technical notes

String replacement across all source files plus one small data-update migration. After the change a repo-wide search for "AlgoForge" returns only the historical migration files and archived plans.

