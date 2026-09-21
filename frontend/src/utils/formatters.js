export const formatVital = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return Number.isInteger(numeric) ? String(Math.trunc(numeric)) : String(numeric);
};

export const formatBloodPressure = (systolic, diastolic) =>
  `${formatVital(systolic)}/${formatVital(diastolic)}`;
