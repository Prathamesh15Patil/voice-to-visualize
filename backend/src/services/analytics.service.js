const groupAndSum = (rows, groupBy, metric) => {
  const result = {};

  rows.forEach((row) => {
    const key = row[groupBy];
    const value = Number(row[metric]) || 0;

    if (!result[key]) {
      result[key] = 0;
    }

    result[key] += value;
  });

  return Object.entries(result).map(([key, value]) => ({
    label: key,
    value,
  }));
};

const getTopN = (data, n = 5) => {
  return data.sort((a, b) => b.value - a.value).slice(0, n);
};


export const executeAnalytics = (rows, config) => {
  validateConfig(rows, config);//if any categpry is not present in user csv and is mentioned by gemini. To avoid app from breaking this function is used.
  
  const { operation, groupBy, metric, limit } = config;

  let result = [];

  if (operation === "group_and_sum") {
    result = groupAndSum(rows, groupBy, metric);
  }

  if (operation === "top_n") {
    result = getTopN(result, limit || 5);
  }

  return result;
};

export const validateConfig = (rows, config) => {
  const sample = rows[0];

  if (!sample[config.groupBy]) {
    throw new Error("Invalid groupBy column");
  }

  if (!sample[config.metric]) {
    throw new Error("Invalid metric column");
  }
};

