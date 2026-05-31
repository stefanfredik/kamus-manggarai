import { Link } from 'react-router-dom';

export function LoginButton() {
  return (
    <div className="flex items-center gap-1.5">
      <Link to="/masuk" className="btn-ghost text-sm">
        Masuk
      </Link>
      <Link to="/daftar" className="btn-primary text-sm">
        Daftar
      </Link>
    </div>
  );
}
