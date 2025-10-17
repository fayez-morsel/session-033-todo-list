import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark";

export default function Welcome() {
  return (
    <main className="relative min-h-screen bg-[var(--app-bg)]">
      <div className="flex min-h-screen flex-col items-center justify-between px-8 pb-10 pt-20">
        <div className="flex-1 w-full max-w-sm">
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <BrandMark
              orientation="vertical"
              size="lg"
              subtitle="Stay organized together"
              className="mt-10"
            />
          </div>
        </div>
        <Link
          to="/auth"
          className="w-full max-w-sm rounded-full bg-primary py-3 text-center text-base font-semibold text-white shadow-[0_16px_30px_rgba(76,175,80,0.35)] transition hover:bg-primaryDark"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
