/**
 * 하나EZ 다이렉트 송금 모니터링
 * - CSV 업로드
 * - KPI / 요약 / 필터 / 정렬
 * - 여러 차트
 * - 실시간 송금 현황 시뮬레이션
 */

const state = {
  rawData: [],
  filteredData: [],
  sortKey: "date",
  sortDir: "desc",
  activeSection: "dashboard",
  countryChart: null,
  errorChart: null,
  trendChart: null,
  statusChart: null,
  countryFlowChart: null,
  liveChart: null,
  liveSeries: [],
  liveTimer: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  setToday();
  loadSampleData();
  startLiveSimulation();
});

function cacheElements() {
  [
    "todayDate", "kpiTotal", "kpiSuccess", "kpiFail", "kpiFailRate", "kpiGrowth",
    "summaryText", "reportStats", "dataTableBody", "countryFilter", "statusFilter",
    "errorFilter", "fileInput", "sampleDataBtn", "copySummaryBtn", "downloadReportBtn",
    "uploadBox", "resetFiltersBtn", "viewAllBtn", "reportDetails",
    "liveCount", "liveQueue", "liveDelay", "liveStatusText", "liveUpdatedAt",
  ].forEach(id => els[id] = document.getElementById(id));
}

function bindEvents() {
  els.fileInput.addEventListener("change", handleFileUpload);
  els.sampleDataBtn.addEventListener("click", loadSampleData);
  els.copySummaryBtn.addEventListener("click", copySummary);
  els.downloadReportBtn.addEventListener("click", downloadReport);
  els.countryFilter.addEventListener("change", applyFilters);
  els.statusFilter.addEventListener("change", applyFilters);
  els.errorFilter.addEventListener("change", applyFilters);
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.viewAllBtn.addEventListener("click", () => focusSection("tableSection"));

  document.querySelectorAll("thead th[data-sort]").forEach(th => {
    th.addEventListener("click", () => handleSort(th.dataset.sort));
  });

  document.querySelectorAll(".side-nav .nav-item").forEach(link => {
    link.addEventListener("click", (event) => {
      const target = link.dataset.focus || link.getAttribute("href")?.replace("#", "");
      if (!target) return;
      event.preventDefault();
      focusSection(target);
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function setToday() {
  const today = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  els.todayDate.textContent = today;
}

function loadSampleData() {
  const sample = [
    { date: "2026-06-24", country: "베트남", service: "하나EZ 다이렉트 송금", count: 420, successCount: 410, failCount: 10, errorCode: "ERR-101", errorMessage: "수취은행 시스템 응답 지연", previousCount: 398 },
    { date: "2026-06-24", country: "필리핀", service: "하나EZ 다이렉트 송금", count: 315, successCount: 307, failCount: 8, errorCode: "ERR-201", errorMessage: "수취인 계좌 검증 실패", previousCount: 290 },
    { date: "2026-06-24", country: "태국", service: "하나EZ 다이렉트 송금", count: 280, successCount: 276, failCount: 4, errorCode: "ERR-101", errorMessage: "수취은행 시스템 응답 지연", previousCount: 265 },
    { date: "2026-06-24", country: "인도네시아", service: "하나EZ 다이렉트 송금", count: 225, successCount: 217, failCount: 8, errorCode: "ERR-301", errorMessage: "국가별 한도 초과", previousCount: 240 },
    { date: "2026-06-24", country: "말레이시아", service: "하나EZ 다이렉트 송금", count: 178, successCount: 172, failCount: 6, errorCode: "ERR-401", errorMessage: "통화 변환 실패", previousCount: 185 },
    { date: "2026-06-24", country: "베트남", service: "하나EZ 다이렉트 송금", count: 95, successCount: 92, failCount: 3, errorCode: "ERR-201", errorMessage: "수취인 계좌 검증 실패", previousCount: 88 },
    { date: "2026-06-24", country: "필리핀", service: "하나EZ 다이렉트 송금", count: 142, successCount: 140, failCount: 2, errorCode: "ERR-501", errorMessage: "서명값 불일치", previousCount: 151 },
    { date: "2026-06-24", country: "태국", service: "하나EZ 다이렉트 송금", count: 120, successCount: 116, failCount: 4, errorCode: "ERR-101", errorMessage: "수취은행 시스템 응답 지연", previousCount: 118 },
  ];
  setData(sample);
}

function startLiveSimulation() {
  state.liveSeries = Array.from({ length: 18 }, (_, i) => ({
    label: `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
    value: 40 + Math.round(Math.random() * 20),
  }));
  updateLiveWidgets();
  renderLiveChart();

  if (state.liveTimer) clearInterval(state.liveTimer);
  state.liveTimer = setInterval(() => {
    const prev = state.liveSeries[state.liveSeries.length - 1]?.value || 50;
    const nextValue = Math.max(20, Math.min(120, prev + Math.round((Math.random() - 0.45) * 18)));
    const nextLabel = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    state.liveSeries.push({ label: nextLabel, value: nextValue });
    if (state.liveSeries.length > 18) state.liveSeries.shift();
    updateLiveWidgets();
    renderLiveChart();
  }, 5000);
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    alert("현재 예제는 CSV 기준으로 구현되어 있습니다. CSV 파일을 업로드해 주세요.");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => setData(parseCSV(reader.result));
  reader.readAsText(file, "utf-8");
}

function parseCSV(text) {
  const lines = String(text || "").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((header, index) => row[header.trim()] = values[index] ?? "");
    return normalizeRow(row);
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeRow(row) {
  return {
    date: row.date || row.Date || "",
    country: row.country || row.Country || "",
    service: row.service || row.Service || "하나EZ 다이렉트 송금",
    count: toNumber(row.count || row.Count),
    successCount: toNumber(row.successCount || row.success || row.SuccessCount),
    failCount: toNumber(row.failCount || row.fail || row.FailCount),
    errorCode: row.errorCode || row.ErrorCode || "N/A",
    errorMessage: row.errorMessage || row.ErrorMessage || "",
    previousCount: toNumber(row.previousCount || row.PreviousCount),
  };
}

function toNumber(value) {
  const num = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function setData(rows) {
  state.rawData = rows.map(normalizeRow).filter(row => row.country || row.date);
  state.filteredData = [...state.rawData];
  populateFilters();
  render();
}

function populateFilters() {
  const countries = ["전체", ...new Set(state.rawData.map(row => row.country).filter(Boolean))];
  const errors = ["전체", ...new Set(state.rawData.map(row => row.errorCode).filter(Boolean))];
  els.countryFilter.innerHTML = countries.map(v => `<option value="${v === "전체" ? "all" : v}">${v}</option>`).join("");
  els.errorFilter.innerHTML = errors.map(v => `<option value="${v === "전체" ? "all" : v}">${v}</option>`).join("");
  els.statusFilter.value = "all";
  els.countryFilter.value = "all";
  els.errorFilter.value = "all";
}

function applyFilters() {
  const country = els.countryFilter.value;
  const status = els.statusFilter.value;
  const errorCode = els.errorFilter.value;
  state.filteredData = state.rawData.filter(row => {
    const rowStatus = row.failCount > 0 ? "fail" : "success";
    return (country === "all" || row.country === country)
      && (status === "all" || rowStatus === status)
      && (errorCode === "all" || row.errorCode === errorCode);
  });
  render();
}

function handleSort(key) {
  if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  else { state.sortKey = key; state.sortDir = "asc"; }
  render();
}

function render() {
  const data = sortData([...state.filteredData]);
  const summary = buildSummary(data);
  const stats = calculateStats(data);
  const focusStats = calculateFocusStats(data);
  updateKPIs(stats);
  renderSummary(summary);
  renderReportStats(stats);
  renderReportDetails(data, focusStats);
  renderTable(data);
  renderCharts(data);
  renderTrendChart(data);
  renderStatusChart(data);
  renderCountryFlowChart(data);
  renderLiveChart();
  updateFocusStyles();
}

function sortData(rows) {
  const dir = state.sortDir === "asc" ? 1 : -1;
  return rows.sort((a, b) => {
    let av = a[state.sortKey];
    let bv = b[state.sortKey];
    if (state.sortKey === "status") {
      av = a.failCount > 0 ? 0 : 1;
      bv = b.failCount > 0 ? 0 : 1;
    }
    if (state.sortKey === "growthRate") {
      av = calcGrowth(a.previousCount, a.count);
      bv = calcGrowth(b.previousCount, b.count);
    }
    if (typeof av === "string") return av.localeCompare(bv, "ko") * dir;
    return (Number(av) - Number(bv)) * dir;
  });
}

function calculateStats(rows) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const success = rows.reduce((sum, row) => sum + row.successCount, 0);
  const fail = rows.reduce((sum, row) => sum + row.failCount, 0);
  const previous = rows.reduce((sum, row) => sum + row.previousCount, 0);
  return {
    total,
    success,
    fail,
    failRate: total ? (fail / total) * 100 : 0,
    growthRate: previous ? ((total - previous) / previous) * 100 : 0,
  };
}

function calculateFocusStats(rows) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const success = rows.reduce((sum, row) => sum + row.successCount, 0);
  return { successRate: total ? (success / total) * 100 : 0 };
}

function calcGrowth(previousCount, currentCount) {
  if (!previousCount) return currentCount > 0 ? 100 : 0;
  return ((currentCount - previousCount) / previousCount) * 100;
}

function updateKPIs(stats) {
  els.kpiTotal.textContent = formatNumber(stats.total);
  els.kpiSuccess.textContent = formatNumber(stats.success);
  els.kpiFail.textContent = formatNumber(stats.fail);
  els.kpiFailRate.textContent = `${stats.failRate.toFixed(1)}%`;
  els.kpiGrowth.textContent = `${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate.toFixed(1)}%`;
}

function buildSummary(rows) {
  const stats = calculateStats(rows);
  const topCountry = getTopEntry(groupSum(rows, "country"));
  const topError = getTopEntry(groupCount(rows, "errorCode"));
  const successRate = stats.total ? ((stats.success / stats.total) * 100).toFixed(1) : "0.0";
  return [
    `금일 하나EZ 다이렉트 송금은 총 ${formatNumber(stats.total)}건 처리되었으며, 성공 ${formatNumber(stats.success)}건, 실패 ${formatNumber(stats.fail)}건으로 실패율은 ${stats.failRate.toFixed(1)}%입니다.`,
    `성공률은 ${successRate}%이며, 전일 대비 증감률은 ${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate.toFixed(1)}%입니다.`,
    topCountry ? `최다 송금 국가는 ${topCountry.label}(${formatNumber(topCountry.value)}건)입니다.` : "",
    topError ? `가장 빈번한 오류 코드는 ${topError.label}(${formatNumber(topError.value)}건)입니다.` : "",
  ].filter(Boolean).join(" ");
}

function renderSummary(text) {
  els.summaryText.textContent = text;
}

function renderReportStats(stats) {
  const items = [
    ["총 송금 건수", formatNumber(stats.total)],
    ["성공 건수", formatNumber(stats.success)],
    ["실패 건수", formatNumber(stats.fail)],
    ["실패율", `${stats.failRate.toFixed(1)}%`],
  ];
  els.reportStats.innerHTML = items.map(([label, value]) => `
    <div class="report-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderReportDetails(rows, focusStats) {
  const topCountry = getTopEntry(groupSum(rows, "country"));
  const topError = getTopEntry(groupCount(rows, "errorCode"));
  const worstRow = rows.length ? rows.reduce((worst, row) => row.failCount > worst.failCount ? row : worst, rows[0]) : null;
  const bestRow = rows.length ? rows.reduce((best, row) => calcGrowth(row.previousCount, row.count) > calcGrowth(best.previousCount, best.count) ? row : best, rows[0]) : null;
  const successRate = focusStats.successRate.toFixed(1);

  const details = [
    ["최다 송금 국가", topCountry ? `${topCountry.label} / ${formatNumber(topCountry.value)}건` : "-"],
    ["최다 오류 코드", topError ? `${topError.label} / ${formatNumber(topError.value)}건` : "-"],
    ["최고 실패 건수", worstRow ? `${worstRow.country} / ${formatNumber(worstRow.failCount)}건` : "-"],
    ["최고 성장 행", bestRow ? `${bestRow.country} / ${calcGrowth(bestRow.previousCount, bestRow.count).toFixed(1)}%` : "-"],
    ["성공률", `${successRate}%`],
    ["모니터링 상태", rows.length ? "정상 감시 중" : "데이터 없음"],
  ];

  els.reportDetails.innerHTML = details.map(([label, value]) => `
    <div class="detail-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderTable(rows) {
  els.dataTableBody.innerHTML = rows.map(row => {
    const growth = calcGrowth(row.previousCount, row.count);
    const status = row.failCount > 0 ? "실패" : "성공";
    const statusClass = row.failCount > 0 ? "status-fail" : "status-success";
    return `
      <tr>
        <td>${row.date}</td>
        <td>${row.country}</td>
        <td>${row.service}</td>
        <td>${formatNumber(row.count)}</td>
        <td>${formatNumber(row.successCount)}</td>
        <td>${formatNumber(row.failCount)}</td>
        <td><span class="status-pill ${statusClass}">${status}</span></td>
        <td>${row.errorCode}</td>
        <td>${row.errorMessage}</td>
        <td>${formatNumber(row.previousCount)}</td>
        <td>${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%</td>
      </tr>
    `;
  }).join("");
}

function renderCharts(rows) {
  const countryMap = groupSum(rows, "country");
  const errorMap = groupCount(rows, "errorCode");
  const countryLabels = Object.keys(countryMap);
  const countryValues = Object.values(countryMap);
  const errorLabels = Object.keys(errorMap);
  const errorValues = Object.values(errorMap);

  if (state.countryChart) state.countryChart.destroy();
  if (state.errorChart) state.errorChart.destroy();

  state.countryChart = new Chart(document.getElementById("countryChart"), {
    type: "bar",
    data: {
      labels: countryLabels,
      datasets: [{
        label: "국가별 송금 건수",
        data: countryValues,
        backgroundColor: "rgba(0, 160, 73, 0.75)",
        borderColor: "#00a049",
        borderWidth: 1,
        borderRadius: 10,
      }],
    },
    options: chartOptions(false, false),
  });

  state.errorChart = new Chart(document.getElementById("errorChart"), {
    type: "doughnut",
    data: {
      labels: errorLabels,
      datasets: [{
        data: errorValues,
        backgroundColor: ["#00a049", "#13c86a", "#0f7a3e", "#1d5f35", "#2ea86a"],
        borderColor: "#07140f",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: "#e9f5ef" } } },
    },
  });
}

function renderTrendChart(rows) {
  const byDate = groupByDate(rows);
  const labels = Object.keys(byDate);
  const totals = labels.map(label => byDate[label].total);
  const success = labels.map(label => byDate[label].success);
  const fail = labels.map(label => byDate[label].fail);

  if (state.trendChart) state.trendChart.destroy();
  state.trendChart = new Chart(document.getElementById("trendChart"), {
    data: {
      labels,
      datasets: [
        { type: "line", label: "총 송금", data: totals, borderColor: "#00a049", backgroundColor: "rgba(0,160,73,0.18)", tension: 0.35, fill: true },
        { type: "line", label: "성공", data: success, borderColor: "#8ef0ba", backgroundColor: "rgba(142,240,186,0.12)", tension: 0.35, fill: false },
        { type: "bar", label: "실패", data: fail, backgroundColor: "rgba(255,107,107,0.45)", borderRadius: 8 },
      ],
    },
    options: chartOptions("bottom", false),
  });
}

function renderStatusChart(rows) {
  const stats = calculateStats(rows);
  if (state.statusChart) state.statusChart.destroy();
  state.statusChart = new Chart(document.getElementById("statusChart"), {
    type: "doughnut",
    data: {
      labels: ["성공", "실패"],
      datasets: [{
        data: [stats.success, stats.fail],
        backgroundColor: ["#00a049", "#ff6b6b"],
        borderColor: "#07140f",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: "#e9f5ef" } } },
    },
  });
}

function renderCountryFlowChart(rows) {
  const countries = Object.keys(groupSum(rows, "country"));
  const totals = countries.map(country => rows.filter(row => row.country === country).reduce((sum, row) => sum + row.count, 0));
  const fails = countries.map(country => rows.filter(row => row.country === country).reduce((sum, row) => sum + row.failCount, 0));

  if (state.countryFlowChart) state.countryFlowChart.destroy();
  state.countryFlowChart = new Chart(document.getElementById("countryFlowChart"), {
    type: "bar",
    data: {
      labels: countries,
      datasets: [
        { label: "총 송금", data: totals, backgroundColor: "rgba(0,160,73,0.75)", borderRadius: 10 },
        { label: "실패", data: fails, backgroundColor: "rgba(255,107,107,0.5)", borderRadius: 10 },
      ],
    },
    options: chartOptions("bottom", true),
  });
}

function renderLiveChart() {
  const canvas = document.getElementById("liveChart");
  if (!canvas) return;
  if (state.liveChart) state.liveChart.destroy();
  state.liveChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: state.liveSeries.map(item => item.label),
      datasets: [{
        label: "실시간 처리량",
        data: state.liveSeries.map(item => item.value),
        borderColor: "#13c86a",
        backgroundColor: "rgba(19,200,106,0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#9ab2a6" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#9ab2a6" }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

function updateLiveWidgets() {
  const latest = state.liveSeries[state.liveSeries.length - 1]?.value || 0;
  const queue = Math.max(0, Math.round(latest * 0.18));
  const delay = Math.round(120 + latest * 4.5);
  els.liveCount.textContent = formatNumber(latest);
  els.liveQueue.textContent = formatNumber(queue);
  els.liveDelay.textContent = `${formatNumber(delay)}ms`;
  els.liveStatusText.textContent = `최신 ${latest}건 반영`;
  els.liveUpdatedAt.textContent = new Date().toLocaleTimeString("ko-KR");
}

function chartOptions(legendPosition = "bottom", stacked = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: legendPosition, labels: { color: "#e9f5ef" } } },
    scales: {
      x: { stacked, ticks: { color: "#9ab2a6" }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { stacked, ticks: { color: "#9ab2a6" }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };
}

function groupSum(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + row.count;
    return acc;
  }, {});
}

function groupCount(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1;
    return acc;
  }, {});
}

function groupByDate(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.date]) acc[row.date] = { total: 0, success: 0, fail: 0 };
    acc[row.date].total += row.count;
    acc[row.date].success += row.successCount;
    acc[row.date].fail += row.failCount;
    return acc;
  }, {});
}

function copySummary() {
  navigator.clipboard.writeText(els.summaryText.textContent || "")
    .then(() => alert("보고서 요약 문구를 복사했습니다."))
    .catch(() => alert("복사에 실패했습니다. 브라우저 권한을 확인해 주세요."));
}

function resetFilters() {
  els.countryFilter.value = "all";
  els.statusFilter.value = "all";
  els.errorFilter.value = "all";
  state.filteredData = [...state.rawData];
  render();
  focusSection("tableSection");
}

function focusSection(sectionId) {
  state.activeSection = sectionId;
  updateFocusStyles();
}

function updateFocusStyles() {
  document.querySelectorAll(".focus-panel, .focus-section").forEach(el => {
    const isActive = el.id === state.activeSection;
    el.classList.toggle("active-focus", isActive);
    el.classList.toggle("dimmed", state.activeSection !== "dashboard" && !isActive);
  });
  document.querySelectorAll(".side-nav .nav-item").forEach(link => {
    const target = link.dataset.focus || link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("active", target === state.activeSection);
  });
}

function getTopEntry(map) {
  const entries = Object.entries(map || {});
  if (!entries.length) return null;
  const [label, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return { label, value };
}

function downloadReport() {
  const rows = state.filteredData.length ? state.filteredData : state.rawData;
  const headers = ["date", "country", "service", "count", "successCount", "failCount", "errorCode", "errorMessage", "previousCount"];
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => csvEscape(row[h])).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "hanaez_direct_remittance_report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString("ko-KR");
}
