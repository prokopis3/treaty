import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';

type Feature = {
  title: string;
  description: string;
  metric: string;
};

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <main class="min-h-screen overflow-x-clip bg-slate-950 text-slate-100">
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="aurora aurora-a"></div>
        <div class="aurora aurora-b"></div>
        <div class="grid-mask h-full w-full"></div>
      </div>

      <header class="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a class="font-display text-xl tracking-wide text-cyan-200" routerLink="/">
          ScrapeFlow
        </a>
        <nav aria-label="Primary" class="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a class="hover:text-cyan-200" href="#features">Features</a>
          <a class="hover:text-cyan-200" href="#workflow">Workflow</a>
          <a class="hover:text-cyan-200" href="#stack">Stack</a>
        </nav>
        <a
          class="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          routerLink="/post/1"
        >
          Open Demo
        </a>
      </header>

      <section
        class="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-18 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10"
        @heroEnter
      >
        <div>
          <p class="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-200">
            Angular + Tailwind v4 + Automation
          </p>
          <h1 class="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            Build browser automations that feel
            <span class="text-cyan-300">instant and observable</span>
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Design resilient scraping pipelines, orchestrate headless browser tasks,
            and stream structured data into your product with a modern Angular
            control center.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a
              class="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_12px_30px_-12px_rgba(34,211,238,0.9)] transition hover:translate-y-[-2px]"
              routerLink="/post/1"
            >
              Launch Preview
            </a>
            <a
              class="rounded-2xl border border-emerald-300/60 bg-emerald-300/10 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
              routerLink="/posts"
            >
              Test Backend Pages
            </a>
            <a
              class="rounded-2xl border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-200"
              href="#workflow"
            >
              See Workflow
            </a>
          </div>

          <div class="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            @for (stat of stats; track stat.label) {
              <div class="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-sm">
                <p class="text-2xl font-bold text-cyan-200">{{ stat.value }}</p>
                <p class="mt-1 text-xs uppercase tracking-wide text-slate-400">{{ stat.label }}</p>
              </div>
            }
          </div>
        </div>

        <aside class="relative rounded-3xl border border-cyan-300/25 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
          <p class="mb-4 text-xs uppercase tracking-[0.2em] text-cyan-200/90">Live Run Monitor</p>
          <div class="space-y-3" id="workflow" @logEnter>
            @for (step of workflow; track step.id) {
              <div class="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div class="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300"></div>
                <div>
                  <p class="font-medium text-slate-100">{{ step.title }}</p>
                  <p class="text-sm text-slate-400">{{ step.detail }}</p>
                </div>
              </div>
            }
          </div>
        </aside>
      </section>

      <section id="features" class="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-10">
        <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 class="font-display text-3xl text-white sm:text-4xl">Why teams pick ScrapeFlow</h2>
          <p class="max-w-xl text-slate-300">
            A focused toolset for browser automation and scraping workflows, from scheduled jobs to anti-breakage alerts.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" @cardsEnter>
          @for (feature of features; track feature.title) {
            <article class="reveal-card rounded-3xl border border-slate-800 bg-slate-900/65 p-5 backdrop-blur">
              <p class="text-xs uppercase tracking-[0.16em] text-cyan-200">{{ feature.metric }}</p>
              <h3 class="mt-3 text-xl font-semibold text-white">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-300">{{ feature.description }}</p>
            </article>
          }
        </div>
      </section>

      <section id="stack" class="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
        <div class="rounded-3xl border border-cyan-200/20 bg-slate-900/60 p-7">
          <p class="text-xs uppercase tracking-[0.2em] text-cyan-200">Tooling stack</p>
          <div class="mt-4 flex flex-wrap gap-3 text-sm">
            @for (item of stack; track item) {
              <span class="rounded-full border border-slate-700 px-4 py-2 text-slate-200">{{ item }}</span>
            }
          </div>
        </div>
      </section>
    </main>
  `,
  styles: `
    :host {
      --panel: rgba(15, 23, 42, 0.62);
      --grid: rgba(56, 189, 248, 0.17);
      display: block;
      font-family: Bahnschrift, 'Segoe UI Variable Text', 'Trebuchet MS', sans-serif;
    }

    .font-display {
      font-family: 'Arial Rounded MT Bold', 'Franklin Gothic Medium', 'Trebuchet MS', sans-serif;
    }

    .grid-mask {
      background-image:
        linear-gradient(to right, transparent 0, transparent 97%, var(--grid) 100%),
        linear-gradient(to bottom, transparent 0, transparent 97%, var(--grid) 100%);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 35%, rgba(0, 0, 0, 0.15) 75%, transparent 100%);
      opacity: 0.35;
    }

    .aurora {
      position: absolute;
      border-radius: 9999px;
      filter: blur(80px);
      opacity: 0.55;
      transform-origin: center;
      animation: drift 16s ease-in-out infinite alternate;
    }

    .aurora-a {
      height: 380px;
      width: 380px;
      left: -100px;
      top: -70px;
      background: radial-gradient(circle at 40% 40%, rgba(34, 211, 238, 0.9), rgba(34, 211, 238, 0));
    }

    .aurora-b {
      height: 420px;
      width: 420px;
      right: -90px;
      top: 110px;
      background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.75), rgba(16, 185, 129, 0));
      animation-delay: 2s;
    }

    @keyframes drift {
      from {
        transform: translateY(0) scale(1);
      }
      to {
        transform: translateY(-18px) scale(1.08);
      }
    }
  `,
  animations: [
    trigger('heroEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(18px)' }),
        animate(
          '700ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('logEnter', [
      transition(':enter', [
        query(
          ':scope > *',
          [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger(
              90,
              animate(
                '500ms cubic-bezier(0.22, 1, 0.36, 1)',
                style({ opacity: 1, transform: 'translateY(0)' })
              )
            ),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('cardsEnter', [
      transition(':enter', [
        query(
          '.reveal-card',
          [
            style({ opacity: 0, transform: 'translateY(20px) scale(0.985)' }),
            stagger(
              110,
              animate(
                '550ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' })
              )
            ),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LandingComponent {
  protected readonly stats = [
    { value: '99.94%', label: 'Run stability' },
    { value: '31M+', label: 'Pages parsed' },
    { value: '2.3s', label: 'Median task start' },
  ];

  protected readonly workflow = [
    {
      id: 1,
      title: 'Scheduler starts headless browsers',
      detail: 'Queue dispatches workers with account-safe concurrency caps.',
    },
    {
      id: 2,
      title: 'Smart extraction reads changing DOM',
      detail: 'Selectors fallback through semantic fingerprints and anchors.',
    },
    {
      id: 3,
      title: 'Validation rules score each payload',
      detail: 'Outliers are quarantined and replayed with visual trace logs.',
    },
    {
      id: 4,
      title: 'Typed webhook streams into your app',
      detail: 'Every field is tracked, versioned, and delivered as JSON events.',
    },
  ];

  protected readonly features: Feature[] = [
    {
      metric: 'Auto-Heal',
      title: 'Resilient selector engine',
      description:
        'When sites change structure, extraction logic recovers using fallback strategy layers.',
    },
    {
      metric: 'Browser Grid',
      title: 'Parallel cloud sessions',
      description:
        'Scale from one run to thousands with rate-aware session orchestration and replay.',
    },
    {
      metric: 'Observability',
      title: 'Trace every automation step',
      description:
        'Timeline snapshots, network logs, and step-level metrics make failures obvious fast.',
    },
    {
      metric: 'Typed Output',
      title: 'Schema-first delivery',
      description:
        'Push validated events to APIs, queues, and data warehouses with strict typed contracts.',
    },
  ];

  protected readonly stack = [
    'Angular 20',
    'Tailwind CSS v4',
    'Playwright',
    'Headless Chromium',
    'Queue Workers',
    'Type-Safe APIs',
  ];
}