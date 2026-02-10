

import dayjs from "dayjs";

type DateFieldViewProps = {
  value: unknown;
  format?: string; // dayjs format tokens (optional)
  fallback?: string; // optional fallback text (default: "-")
};

export const DateFieldViewComponent = ({
  value,
  format,
  fallback = "-",
}: DateFieldViewProps) => {
  if (!value) {
    return <>{fallback}</>;
  }

  // Normalize value to Date
  const date =
    value instanceof Date ? value : new Date(value as any);

  // Invalid date → render raw value
  if (isNaN(date.getTime())) {
    return <>{String(value)}</>;
  }

  // Explicit format → dayjs
  if (format) {
    return <>{dayjs(date).format(format)}</>;
  }

  // Default → browser locale
  return <>{date.toLocaleDateString()}</>;
};
