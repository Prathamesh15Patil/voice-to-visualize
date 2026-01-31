export const groupAndSum = (rows, groupBy, metric) => {
  const result = {};

  rows.forEach(row => {
    const key = row[groupBy];
    const value = Number(row[metric]) || 0;

    if (!result[key]) {
      result[key] = 0;
    }

    result[key] += value;
  });

  return Object.entries(result).map(([key, value]) => ({
    label: key,
    value
  }));
};

export const getTopN = (data, n = 5) => {
  return data
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
};
