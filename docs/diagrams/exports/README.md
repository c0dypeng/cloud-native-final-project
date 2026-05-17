# Diagram exports

These PNGs are rasterized from the Mermaid source blocks in `../../*.md` and
`../../sequences/*.md`. Pull them into the final-report PDF or slide deck.

To regenerate after editing the Markdown source:

```bash
for src in architecture er safety-report need-help reminder-cron sse-streaming; do
  awk '/^```mermaid$/,/^```$/' docs/${src}.md docs/sequences/${src}.md 2>/dev/null \
    | sed '1d;$d' > /tmp/${src}.mmd
  bunx @mermaid-js/mermaid-cli@latest -i /tmp/${src}.mmd \
       -o docs/diagrams/exports/${src}.png -b transparent
done
```

`auth-flow` contains two `sequenceDiagram` blocks; render them separately as
`auth-flow-1.png` (user login) and `auth-flow-2.png` (admin login).

| File                  | Source                                           |
| --------------------- | ------------------------------------------------ |
| `architecture.png`    | `docs/architecture.md`                           |
| `er.png`              | `docs/er.md`                                     |
| `safety-report.png`   | `docs/sequences/safety-report.md`                |
| `need-help.png`       | `docs/sequences/need-help.md`                    |
| `reminder-cron.png`   | `docs/sequences/reminder-cron.md`                |
| `auth-flow-1.png`     | `docs/sequences/auth-flow.md` (user login)       |
| `auth-flow-2.png`     | `docs/sequences/auth-flow.md` (admin login)      |
| `sse-streaming.png`   | `docs/sequences/sse-streaming.md`                |
