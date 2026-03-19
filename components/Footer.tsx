import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-[#fbf8f0]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-3 px-6 py-8 text-sm text-stone-600">
        <Link href="/terms" className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900">
          Terms
        </Link>
        <span>·</span>
        <Link href="/privacy" className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
