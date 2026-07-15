var chartInstance = null;

function renderChart(data) {
  if (chartInstance) chartInstance.destroy();   // 없으면 메모리 누수 + 툴팁 중복
  chartInstance = new Chart(canvas, config);
}
