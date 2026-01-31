export const formatChartData = (data, label = "Sales") => {
  return {
    labels: data.map(item => item.label),
    datasets: [
      {
        label,
        data: data.map(item => item.value)
      }
    ]
  };
};
