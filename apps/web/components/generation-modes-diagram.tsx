"use client";

function ScheduleItem({
  time,
  label,
  color,
}: {
  time: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-t border-border/50 first:border-t-0">
      <span className="text-[10px] text-muted-foreground/60 w-12 shrink-0 tabular-nums">
        {time}
      </span>
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function InlineModeDiagram() {
  return (
    <div className="flex flex-col h-full">
      <div className="text-sm font-medium text-foreground text-center mb-3">
        Inline Mode
      </div>
      <div className="flex-1 border border-border rounded-2xl bg-background overflow-hidden flex flex-col">
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-muted-foreground/20 rounded-2xl rounded-br px-3.5 py-2 max-w-[85%]">
              <span className="text-[11px] text-foreground/80">
                I have back-to-back meetings today
              </span>
            </div>
          </div>

          {/* AI response */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground/70">
              Packed day! Here&apos;s what you&apos;ve got:
            </p>
            <div className="bg-muted/40 border border-border rounded-xl p-3 w-[92%]">
              <div className="text-[11px] font-semibold text-foreground/80 mb-2">
                Today&apos;s Schedule
              </div>
              <ScheduleItem
                time="10:00 AM"
                label="Design Review"
                color="#7aa2f7"
              />
              <ScheduleItem
                time="1:00 PM"
                label="Sprint Planning"
                color="#bb9af7"
              />
              <ScheduleItem
                time="3:30 PM"
                label="Team Standup"
                color="#9ece6a"
              />
              <ScheduleItem
                time="4:30 PM"
                label="Eng All-Hands"
                color="#e0af68"
              />
            </div>
          </div>
        </div>

        {/* Prompt input */}
        <div className="p-2.5">
          <div className="bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/40 flex-1">
              Message...
            </span>
            <div className="w-5 h-5 rounded-md bg-muted-foreground/20 flex items-center justify-center">
              <svg
                className="w-2.5 h-2.5 text-muted-foreground/50"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
                  transform="rotate(-90 12 12)"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          AI decides when UI beats text
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
          <span>AI chatbots</span>
          <span className="text-muted-foreground/30">/</span>
          <span>Copilots</span>
          <span className="text-muted-foreground/30">/</span>
          <span>Assistants</span>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="w-full h-full flex flex-col bg-muted/20">
      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0"
        >
          <rect
            x="2"
            y="14"
            width="5"
            height="8"
            rx="1"
            className="fill-muted-foreground/60"
          />
          <rect
            x="9.5"
            y="8"
            width="5"
            height="14"
            rx="1"
            className="fill-muted-foreground/60"
          />
          <rect
            x="17"
            y="2"
            width="5"
            height="20"
            rx="1"
            className="fill-muted-foreground/60"
          />
        </svg>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground/50">Pricing</span>
          <span className="text-[9px] text-muted-foreground/50">Blog</span>
          <span className="text-[8px] font-semibold bg-foreground text-background rounded-md px-1.5 py-0.5 whitespace-nowrap">
            Get Started
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-center px-4">
        <span className="text-[8px] font-medium text-green-400 bg-green-400/10 border border-green-400/15 rounded-full px-2 py-0.5">
          Trusted by 2,000+ teams
        </span>
        <div className="text-sm font-bold text-foreground leading-tight">
          Analytics that
          <br />
          move the needle
        </div>
        <div className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Ship what matters. No setup required.
        </div>
        <div className="flex gap-1.5 mt-1">
          <button className="bg-foreground text-background text-[9px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap">
            Start Free
          </button>
          <button className="border border-border text-muted-foreground text-[9px] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap">
            Book Demo
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-center gap-3 py-2 border-t border-border/50">
        <span className="text-[8px] text-muted-foreground/30">Privacy</span>
        <span className="text-[8px] text-muted-foreground/30">Terms</span>
        <span className="text-[8px] text-muted-foreground/30">Status</span>
      </div>
    </div>
  );
}

function StandaloneModeDiagram() {
  return (
    <div className="flex flex-col h-full">
      <div className="text-sm font-medium text-foreground text-center mb-3">
        Standalone Mode
      </div>
      <div className="flex-1 border border-border rounded-2xl bg-background overflow-hidden flex flex-row">
        {/* Left panel - conversation */}
        <div className="w-[38%] border-r border-border/50 flex flex-col">
          <div className="flex-1 p-3 space-y-2.5">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-muted-foreground/20 rounded-2xl rounded-br px-2.5 py-1.5">
                <span className="text-[10px] text-foreground/80 block leading-relaxed">
                  A landing page for my analytics startup
                </span>
              </div>
            </div>
            {/* AI text */}
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Here&apos;s a clean landing page with a hero, nav, and CTAs.
            </p>
          </div>

          {/* Prompt input */}
          <div className="p-2.5">
            <div className="bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground/40 flex-1">
                Message...
              </span>
              <div className="w-5 h-5 rounded-md bg-muted-foreground/20 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-muted-foreground/50"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
                    transform="rotate(-90 12 12)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - landing page */}
        <div className="flex-1">
          <LandingPage />
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Prompt in, UI out
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
          <span>Website builders</span>
          <span className="text-muted-foreground/30">/</span>
          <span>Text-to-widget</span>
          <span className="text-muted-foreground/30">/</span>
          <span>Dashboards</span>
        </div>
      </div>
    </div>
  );
}

export function GenerationModesDiagram() {
  return (
    <div className="not-prose my-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="h-[420px]">
          <InlineModeDiagram />
        </div>
        <div className="h-[420px]">
          <StandaloneModeDiagram />
        </div>
      </div>
    </div>
  );
}
