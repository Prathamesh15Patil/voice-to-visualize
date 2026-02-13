export const formatChartData = (data, label) => {
  return {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: label || "Value",
        data: data.map((item) => item.value),
      },
    ],
  };
};
