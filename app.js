const HISTORY_KEY = "perf.history";

const DEPT_TARGETS = {
  "WM부문 1본부": { 분기목표: 550, 연목표: 2200 },
  "WM부문 2본부": { 분기목표: 460, 연목표: 1840 },
  "WM부문 3본부": { 분기목표: 370, 연목표: 1480 },
  "WM부문 4본부": { 분기목표: 290, 연목표: 1160 },
  "디지털&연금부문": { 분기목표: 185, 연목표: 740 },
  "S&T부문": { 분기목표: 640, 연목표: 2560 },
  "IB1부문": { 분기목표: 400, 연목표: 1600 },
  "IB2부문": { 분기목표: 335, 연목표: 1340 },
};

// 부서별 과거 실적(억원): 1분기 총, 2분기 총, 7월 총, 8월 일별(오늘 포함) — 샘플 데모용
const DEPT_HISTORY_SEED = {
  "WM부문 1본부": { q1: 530, q2: 545, jul: 180, aug: [["2026-08-01", 44], ["2026-08-04", 45], ["2026-08-08", 43], ["2026-08-13", 46]] },
  "WM부문 2본부": { q1: 450, q2: 470, jul: 150, aug: [["2026-08-01", 36], ["2026-08-04", 38], ["2026-08-08", 35], ["2026-08-13", 39]] },
  "WM부문 3본부": { q1: 365, q2: 355, jul: 120, aug: [["2026-08-01", 29], ["2026-08-04", 30], ["2026-08-08", 28], ["2026-08-13", 31]] },
  "WM부문 4본부": { q1: 280, q2: 295, jul: 95, aug: [["2026-08-01", 23], ["2026-08-04", 24], ["2026-08-08", 22], ["2026-08-13", 25]] },
  "디지털&연금부문": { q1: 178, q2: 182, jul: 60, aug: [["2026-08-01", 14], ["2026-08-04", 15], ["2026-08-08", 14], ["2026-08-13", 16]] },
  "S&T부문": { q1: 615, q2: 680, jul: 210, aug: [["2026-08-01", 50], ["2026-08-04", 52], ["2026-08-08", 49], ["2026-08-13", 54]] },
  "IB1부문": { q1: 390, q2: 410, jul: 130, aug: [["2026-08-01", 31], ["2026-08-04", 32], ["2026-08-08", 30], ["2026-08-13", 34]] },
  "IB2부문": { q1: 328, q2: 335, jul: 110, aug: [["2026-08-01", 26], ["2026-08-04", 27], ["2026-08-08", 25], ["2026-08-13", 29]] },
};

function buildSampleHistory() {
  const rows = [];
  Object.entries(DEPT_HISTORY_SEED).forEach(([부서, d]) => {
    rows.push({ 부서, 날짜: "2026-03-31", "실적(억원)": d.q1 });
    rows.push({ 부서, 날짜: "2026-06-30", "실적(억원)": d.q2 });
    rows.push({ 부서, 날짜: "2026-07-31", "실적(억원)": d.jul });
    d.aug.forEach(([날짜, 값]) => rows.push({ 부서, 날짜, "실적(억원)": 값 }));
  });
  return rows;
}

const state = {
  history: loadHistory(),
};

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const sampleBtn = document.getElementById("sampleBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

["dragenter", "dragover"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  })
);
dropZone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

sampleBtn.addEventListener("click", () => {
  state.history = buildSampleHistory();
  saveHistory();
  renderAll();
});

resetBtn.addEventListener("click", () => {
  state.history = [];
  fileInput.value = "";
  saveHistory();
  renderAll();
});

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function quarterOf(dateStr) {
  const month = Number(dateStr.slice(5, 7));
  return Math.floor((month - 1) / 3) + 1;
}

function quarterBounds(year, q) {
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(lastDay)}` };
}

function prevQuarter(year, q) {
  return q === 1 ? { year: year - 1, q: 4 } : { year, q: q - 1 };
}

function daysInclusive(startStr, endStr) {
  return Math.round((new Date(endStr) - new Date(startStr)) / 86400000) + 1;
}

// 목표를 기간 진행률에 비례해 보정 (분기/연 초반에 목표 대비 무조건 미달로 보이는 것을 방지)
function pacedTarget(target, start, end, today) {
  const totalDays = daysInclusive(start, end);
  const elapsedDays = Math.min(daysInclusive(start, today), totalDays);
  return target * (elapsedDays / totalDays);
}

function isNumericValue(v) {
  if (v === null || v === undefined || v === "") return false;
  return !isNaN(Number(String(v).replace(/,/g, "")));
}

function toNumber(v) {
  return Number(String(v).replace(/,/g, "")) || 0;
}

function formatNumber(n) {
  return Math.round(Number(n)).toLocaleString("ko-KR");
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function achievementBadge(actual, target) {
  if (!target) return "-";
  const pct = Math.round((actual / target) * 100);
  const status = pct >= 100 ? "good" : "critical";
  const arrow = pct >= 100 ? "▲" : "▼";
  return `<span class="badge badge-${status}">${arrow} ${pct}%</span>`;
}

function deltaBadge(current, previous) {
  const diff = Math.round(current - previous);
  const status = diff >= 0 ? "good" : "critical";
  const arrow = diff >= 0 ? "▲" : "▼";
  const sign = diff >= 0 ? "+" : "";
  return `<span class="badge badge-${status}">${arrow} ${sign}${formatNumber(diff)}</span>`;
}

function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  let pending = files.length;
  const today = todayStr();
  state.history = state.history.filter((r) => r.날짜 !== today);

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        json.forEach((row) => {
          const 부서 = row["부서"];
          const 실적컬럼 = Object.keys(row).find((k) => k !== "부서" && k !== "날짜" && isNumericValue(row[k]));
          if (!부서 || !실적컬럼) return;
          state.history.push({ 부서, 날짜: today, "실적(억원)": toNumber(row[실적컬럼]) });
        });
      } catch (err) {
        alert(`${file.name} 파일을 읽는 중 오류가 발생했습니다: ${err.message}`);
      } finally {
        pending -= 1;
        if (pending === 0) {
          saveHistory();
          renderAll();
        }
      }
    };
    reader.readAsBinaryString(file);
  });
}

function sumByDept(rows) {
  const map = new Map();
  rows.forEach((r) => {
    map.set(r.부서, (map.get(r.부서) || 0) + toNumber(r["실적(억원)"]));
  });
  return map;
}

function renderStatus() {
  const today = todayStr();
  const todayCount = state.history.filter((r) => r.날짜 === today).length;
  statusEl.textContent = state.history.length
    ? `누적 ${state.history.length}건 저장됨 · 오늘(${today}) 입력 ${todayCount}건`
    : "아직 업로드된 데이터가 없습니다.";
}

function renderToday() {
  const today = todayStr();
  document.getElementById("todayLabel").textContent = `${today} 기준`;
  const rows = state.history.filter((r) => r.날짜 === today);
  const container = document.getElementById("todayTable");
  if (!rows.length) {
    container.innerHTML = `<p class="empty">오늘자 데이터가 아직 없습니다. 파일을 업로드해주세요.</p>`;
    return;
  }
  const byDept = sumByDept(rows);
  const total = Array.from(byDept.values()).reduce((s, v) => s + v, 0);
  const body = Array.from(byDept.entries())
    .map(([부서, v]) => `<tr><td>${escapeHtml(부서)}</td><td class="num">${formatNumber(v)}</td></tr>`)
    .join("");
  container.innerHTML = `<table><thead><tr><th>부서</th><th class="num">오늘 실적(억원)</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td>합계</td><td class="num">${formatNumber(total)}</td></tr></tfoot></table>`;
}

function renderQuarter() {
  const today = todayStr();
  const year = Number(today.slice(0, 4));
  const q = quarterOf(today);
  const { start, end } = quarterBounds(year, q);
  const paceRatio = Math.min(daysInclusive(start, today) / daysInclusive(start, end), 1);
  document.getElementById("quarterLabel").textContent =
    `${year}년 ${q}분기 (${start} ~ ${end}, 오늘까지 누적) · 목표는 분기 진행률(${Math.round(paceRatio * 100)}%)에 맞춰 보정된 값`;

  const rows = state.history.filter((r) => r.날짜 >= start && r.날짜 <= end);
  const container = document.getElementById("quarterTable");
  if (!rows.length) {
    container.innerHTML = `<p class="empty">이번 분기 데이터가 아직 없습니다.</p>`;
    return;
  }
  const byDept = sumByDept(rows);
  let totalActual = 0;
  let totalTarget = 0;
  const body = Array.from(byDept.entries())
    .map(([부서, actual]) => {
      const target = pacedTarget(DEPT_TARGETS[부서]?.분기목표 || 0, start, end, today);
      totalActual += actual;
      totalTarget += target;
      return `<tr><td>${escapeHtml(부서)}</td><td class="num">${formatNumber(target)}</td><td class="num">${formatNumber(actual)}</td><td class="num">${achievementBadge(actual, target)}</td></tr>`;
    })
    .join("");
  container.innerHTML = `<table><thead><tr><th>부서</th><th class="num">진행목표(억원)</th><th class="num">분기실적(억원)</th><th class="num">달성률</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td>합계</td><td class="num">${formatNumber(totalTarget)}</td><td class="num">${formatNumber(totalActual)}</td><td class="num">${achievementBadge(totalActual, totalTarget)}</td></tr></tfoot></table>`;
}

function renderYear() {
  const today = todayStr();
  const year = Number(today.slice(0, 4));
  const q = quarterOf(today);
  const curBounds = quarterBounds(year, q);
  const prev = prevQuarter(year, q);
  const prevBounds = quarterBounds(prev.year, prev.q);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const yearPaceRatio = Math.min(daysInclusive(yearStart, today) / daysInclusive(yearStart, yearEnd), 1);
  document.getElementById("yearLabel").innerHTML =
    `${yearStart} ~ ${today} 누적 · 목표는 연 진행률(${Math.round(yearPaceRatio * 100)}%)에 맞춰 보정된 값 · 전분기대비 = 이번 분기(진행중) 누적 vs ${prev.year}년 ${prev.q}분기 전체 실적`;

  const ytdRows = state.history.filter((r) => r.날짜.slice(0, 4) === String(year) && r.날짜 <= today);
  const curQtdRows = state.history.filter((r) => r.날짜 >= curBounds.start && r.날짜 <= curBounds.end);
  const prevRows = state.history.filter((r) => r.날짜 >= prevBounds.start && r.날짜 <= prevBounds.end);
  const container = document.getElementById("yearTable");
  if (!ytdRows.length) {
    container.innerHTML = `<p class="empty">올해 누적 데이터가 아직 없습니다.</p>`;
    return;
  }
  const ytdByDept = sumByDept(ytdRows);
  const curQtdByDept = sumByDept(curQtdRows);
  const prevByDept = sumByDept(prevRows);
  let totalActual = 0;
  let totalTarget = 0;
  let totalCurQtd = 0;
  let totalPrev = 0;
  const body = Array.from(ytdByDept.entries())
    .map(([부서, actual]) => {
      const target = pacedTarget(DEPT_TARGETS[부서]?.연목표 || 0, yearStart, yearEnd, today);
      const curQtd = curQtdByDept.get(부서) || 0;
      const prevVal = prevByDept.get(부서) || 0;
      totalActual += actual;
      totalTarget += target;
      totalCurQtd += curQtd;
      totalPrev += prevVal;
      return `<tr><td>${escapeHtml(부서)}</td><td class="num">${formatNumber(target)}</td><td class="num">${formatNumber(actual)}</td><td class="num">${achievementBadge(actual, target)}</td><td class="num">${formatNumber(prevVal)}</td><td class="num">${deltaBadge(curQtd, prevVal)}</td></tr>`;
    })
    .join("");
  container.innerHTML = `<table><thead><tr><th>부서</th><th class="num">연진행목표(억원)</th><th class="num">연누적실적(억원)</th><th class="num">달성률</th><th class="num">전분기실적(억원)</th><th class="num">전분기대비</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td>합계</td><td class="num">${formatNumber(totalTarget)}</td><td class="num">${formatNumber(totalActual)}</td><td class="num">${achievementBadge(totalActual, totalTarget)}</td><td class="num">${formatNumber(totalPrev)}</td><td class="num">${deltaBadge(totalCurQtd, totalPrev)}</td></tr></tfoot></table>`;
}

function renderAll() {
  renderStatus();
  renderToday();
  renderQuarter();
  renderYear();
}

renderAll();
