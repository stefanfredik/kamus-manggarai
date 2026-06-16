import { useQuery } from '@tanstack/react-query';
import { Trophy, Award, Search, Users } from 'lucide-react';
import { authApi } from '../api/authApi';

// Helper to determine the badge based on approved count
interface BadgeInfo {
  name: string;
  color: string;
  bgColor: string;
  border: string;
}

function getBadge(count: number): BadgeInfo {
  if (count >= 150) {
    return {
      name: 'Mori (Pakar)',
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200/50 dark:border-amber-900/30',
    };
  }
  if (count >= 51) {
    return {
      name: 'Rana (Pemerhati)',
      color: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200/50 dark:border-purple-900/30',
    };
  }
  if (count >= 11) {
    return {
      name: 'Sapu (Aktif)',
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200/50 dark:border-blue-900/30',
    };
  }
  return {
    name: 'Tunas (Pemula)',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200/50 dark:border-emerald-900/30',
  };
}

export function LeaderboardPage() {
  const { data: leaderboard = [], isLoading, error } = useQuery({
    queryKey: ['contributors', 'leaderboard'],
    queryFn: () => authApi.getLeaderboard(100),
  });

  // Separate top 3 podium from the rest
  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  // Podium sorting: [2nd, 1st, 3rd] for visual presentation
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ ...topThree[1], rank: 2 });
  if (topThree[0]) podiumOrder.push({ ...topThree[0], rank: 1 });
  if (topThree[2]) podiumOrder.push({ ...topThree[2], rank: 3 });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <div className="skeleton h-8 w-1/3" />
          <div className="skeleton h-4 w-2/3" />
          <div className="grid gap-4 mt-8 sm:grid-cols-3">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-56 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
          <div className="skeleton h-64 rounded-2xl mt-6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-rose-500">Gagal memuat papan peringkat kontributor.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <header className="mb-8 text-center max-w-2xl mx-auto">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/30 dark:border-amber-900/20 shadow-sm">
          <Trophy size={14} className="animate-bounce" /> Pahlawan Bahasa
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
          Pelestari Teraktif
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Apresiasi tinggi kepada ase-kae yang telah meluangkan waktu menyumbangkan kosakata baru guna melestarikan warisan Bahasa Manggarai.
        </p>
      </header>

      {leaderboard.length === 0 ? (
        <div className="card p-12 text-center rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-850">
          <Users size={48} className="mx-auto text-slate-350 dark:text-slate-650" />
          <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Belum Ada Kontributor</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Jadilah orang pertama yang mendaftarkan kosakata baru dan tampil di papan peringkat!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium (Only visible if there is data) */}
          {topThree.length > 0 && (
            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 mt-8 px-4">
              {podiumOrder.map((user) => {
                const badge = getBadge(user.approved_count);
                const isFirst = user.rank === 1;
                
                const cardHeight = isFirst ? 'sm:h-64 h-auto pt-6 border-amber-300 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/20 to-transparent' : 'sm:h-52 h-auto pt-4';
                const trophyColor = user.rank === 1 ? 'text-amber-500' : user.rank === 2 ? 'text-slate-400' : 'text-amber-600';
                
                return (
                  <div
                    key={user.user_id}
                    className={`card relative w-full sm:w-60 flex flex-col items-center text-center p-5 rounded-2xl border ${cardHeight} transition-all duration-300 hover:shadow-md order-none`}
                  >
                    {/* Rank Badge Indicator */}
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow ${
                      user.rank === 1 ? 'bg-amber-400 text-slate-950' : user.rank === 2 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-white'
                    }`}>
                      {user.rank}
                    </div>

                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.name} 
                        className={`rounded-full object-cover shadow ${isFirst ? 'h-16 w-16' : 'h-14 w-14'}`}
                      />
                    ) : (
                      <div className={`flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-350 font-bold shadow ${isFirst ? 'h-16 w-16 text-xl' : 'h-14 w-14 text-lg'}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white truncate w-full px-2">
                      {user.name}
                    </h3>
                    
                    <div className="mt-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        Kosakata Disetujui
                      </span>
                      <span className={`text-xl font-extrabold flex items-center gap-1 ${trophyColor}`}>
                        <Trophy size={16} /> {user.approved_count}
                      </span>
                    </div>

                    <span className={`mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bgColor} ${badge.color} ${badge.border}`}>
                      <Award size={10} /> {badge.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Remaining Contributors List */}
          {remaining.length > 0 && (
            <div className="card p-0 overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-soft">
              <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                  Peringkat Lainnya
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-3.5 text-center w-20">Rank</th>
                      <th className="px-6 py-3.5">Kontributor</th>
                      <th className="px-6 py-3.5 text-center">Kosakata Disetujui</th>
                      <th className="px-6 py-3.5">Gelar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {remaining.map((user, idx) => {
                      const rank = idx + 4;
                      const badge = getBadge(user.approved_count);
                      return (
                        <tr key={user.user_id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="px-6 py-4 text-center font-bold text-slate-400 dark:text-slate-500">
                            #{rank}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.name} 
                                  className="h-8 w-8 rounded-full object-cover shadow-sm"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-xs font-bold text-primary-700 dark:text-primary-350 shadow-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {user.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-slate-700 dark:text-slate-300">
                            {user.approved_count}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bgColor} ${badge.color} ${badge.border}`}>
                              <Award size={10} /> {badge.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
