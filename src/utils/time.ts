export function safeParseDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTimeKo(iso: string): string {
  const d = safeParseDate(iso);
  if (!d) return iso;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function computeTimeLabels(opts: {
  startIso: string;
  endIso: string;
  now?: Date;
}): {
  untilStartMs: number;
  remainingMs: number;
  untilStartLabel: string;
  remainingLabel: string;
} {
  const now = opts.now ?? new Date();
  const start = safeParseDate(opts.startIso);
  const end = safeParseDate(opts.endIso);

  if (!start || !end) {
    return {
      untilStartMs: Number.NaN,
      remainingMs: Number.NaN,
      untilStartLabel: '-',
      remainingLabel: '-',
    };
  }

  const untilStartMs = Math.max(0, start.getTime() - now.getTime());
  const remainingMs = Math.max(0, end.getTime() - now.getTime());

  const untilStartMinutes = Math.ceil(untilStartMs / (60 * 1000));
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  const formatRelative = (ms: number) => {
    if (!Number.isFinite(ms)) return '-';
    const totalMinutes = Math.ceil(ms / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}분`;
    return `${hours}시간 ${minutes}분`;
  };

  const untilStartLabel =
    untilStartMinutes >= 24 * 60
      ? `${formatDateTimeKo(opts.startIso)}`
      : `${formatRelative(untilStartMs)} 남음`;

  const remainingLabel =
    remainingMinutes >= 24 * 60
      ? `${formatDateTimeKo(opts.endIso)}`
      : `${formatRelative(remainingMs)} 남음`;

  return { untilStartMs, remainingMs, untilStartLabel, remainingLabel };
}
