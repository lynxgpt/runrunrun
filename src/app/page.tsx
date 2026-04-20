import { Header } from "@/components/sections/header";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakHero } from "@/components/sections/streak-hero";
import { Foreword } from "@/components/sections/foreword";
import { NotableRuns } from "@/components/sections/notable-runs";
import { Statistics } from "@/components/sections/statistics";
import { Geography } from "@/components/sections/geography";
import { DailyLog } from "@/components/sections/daily-log";
import { SiteFooter } from "@/components/sections/site-footer";

export default function Home() {
  return (
    <div className="container min-h-screen mx-auto p-8">
      <ThemeToggle />
      <Header />
      <StreakHero />
      <Foreword />
      <NotableRuns />
      <Geography />
      <Statistics />
      <DailyLog />
      <SiteFooter />
    </div>
  );
}
