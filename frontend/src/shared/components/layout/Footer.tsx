export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-50 py-6 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500">
        <p>
          © {new Date().getFullYear()} Kamus Digital Bahasa Manggarai – Bahasa Indonesia.
        </p>
        <p className="mt-1">
          Pelestarian bahasa daerah melalui kontribusi komunitas.
        </p>
      </div>
    </footer>
  );
}
