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

// 부서별 과거 실적(억원): 1분기 총, 2분기 총, 7월 총, 8월 주간(월요일 기준, 최근주 포함) — 샘플 데모용
const DEPT_HISTORY_SEED = {
  "WM부문 1본부": { q1: 530, q2: 545, jul: 180, weeks: [["2026-08-03", 87], ["2026-08-10", 91]] },
  "WM부문 2본부": { q1: 450, q2: 470, jul: 150, weeks: [["2026-08-03", 72], ["2026-08-10", 76]] },
  "WM부문 3본부": { q1: 365, q2: 355, jul: 120, weeks: [["2026-08-03", 57], ["2026-08-10", 61]] },
  "WM부문 4본부": { q1: 245, q2: 250, jul: 55, weeks: [["2026-08-03", 24], ["2026-08-10", 21]] },
  "디지털&연금부문": { q1: 178, q2: 182, jul: 60, weeks: [["2026-08-03", 29], ["2026-08-10", 30]] },
  "S&T부문": { q1: 615, q2: 680, jul: 210, weeks: [["2026-08-03", 100], ["2026-08-10", 105]] },
  "IB1부문": { q1: 390, q2: 410, jul: 130, weeks: [["2026-08-03", 62], ["2026-08-10", 65]] },
  "IB2부문": { q1: 328, q2: 335, jul: 110, weeks: [["2026-08-03", 52], ["2026-08-10", 55]] },
};

function buildSampleHistory() {
  const rows = [];
  Object.entries(DEPT_HISTORY_SEED).forEach(([부서, d]) => {
    rows.push({ 부서, 날짜: "2026-03-31", "실적(억원)": d.q1 });
    rows.push({ 부서, 날짜: "2026-06-30", "실적(억원)": d.q2 });
    rows.push({ 부서, 날짜: "2026-07-31", "실적(억원)": d.jul });
    d.weeks.forEach(([날짜, 값]) => rows.push({ 부서, 날짜, "실적(억원)": 값 }));
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

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = true));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).hidden = false;
  });
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

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 해당 날짜가 속한 주의 월요일 날짜를 반환 (주간 업데이트 버킷 키)
function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(dateStr, diffToMonday);
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

function pct(actual, target) {
  return target ? Math.round((actual / target) * 100) : null;
}

function badgeHtml(value, isGood) {
  const status = isGood ? "good" : "critical";
  const arrow = isGood ? "▲" : "▼";
  return `<span class="badge badge-${status}">${arrow} ${value}</span>`;
}

function meterHtml(actual, target) {
  const p = target ? Math.min((actual / target) * 100, 100) : 0;
  const status = actual >= target ? "good" : "critical";
  return `<div class="meter"><div class="meter-fill ${status}" style="width:${p}%"></div></div>`;
}

function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  let pending = files.length;
  const weekKey = mondayOf(todayStr());
  state.history = state.history.filter((r) => r.날짜 !== weekKey);

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
          state.history.push({ 부서, 날짜: weekKey, "실적(억원)": toNumber(row[실적컬럼]) });
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
  const thisWeek = mondayOf(today);
  const nextWeek = addDays(thisWeek, 7);
  const weekCount = state.history.filter((r) => r.날짜 === thisWeek).length;
  statusEl.textContent = state.history.length
    ? `누적 ${state.history.length}건 저장됨 · 이번 주(${thisWeek} 월요일) 입력 ${weekCount}건`
    : "아직 업로드된 데이터가 없습니다.";

  const updatedAtEl = document.getElementById("updatedAt");
  if (!state.history.length) {
    updatedAtEl.textContent = "데이터를 업로드하면 시작됩니다";
    updatedAtEl.classList.remove("stale");
    return;
  }
  const latest = latestDate();
  const daysStale = daysInclusive(latest, today) - 1;
  const isStale = daysStale > 10;
  updatedAtEl.textContent = isStale
    ? `⚠ 업데이트 지연 · 마지막 입력 ${latest} (${daysStale}일 전) · 다음 업데이트 예정 ${nextWeek}(월) 오전 7시`
    : `${latest} 기준 · 다음 업데이트 예정 ${nextWeek}(월) 오전 7시`;
  updatedAtEl.classList.toggle("stale", isStale);
}

function latestDate() {
  return state.history.reduce((max, r) => (r.날짜 > max ? r.날짜 : max), "");
}

function deptListHtml(rows, { withMeter } = {}) {
  if (!rows.length) return `<p class="empty">표시할 데이터가 없습니다.</p>`;
  return rows
    .map((r) => {
      const meter = withMeter ? meterHtml(r.actual, r.target) : "";
      const foot = withMeter
        ? `<div class="dept-row-foot">${badgeHtml(`${pct(r.actual, r.target)}%`, r.actual >= r.target)}<span class="dept-target">목표 ${formatNumber(r.target)}억</span></div>`
        : "";
      return `<div class="dept-row">
        <div class="dept-row-head"><span class="dept-name">${escapeHtml(r.부서)}</span><span class="dept-value">${formatNumber(r.actual)}<span class="unit">억원</span></span></div>
        ${meter}
        ${foot}
      </div>`;
    })
    .join("");
}

function renderToday() {
  const latest = latestDate();
  const label = latest || todayStr();
  document.getElementById("todayLabel").textContent = latest
    ? `${latest}(월) 기준 · 이번 주 실적`
    : "아직 입력된 데이터가 없습니다";

  const rows = state.history.filter((r) => r.날짜 === latest);
  const byDept = Array.from(sumByDept(rows).entries()).map(([부서, actual]) => ({ 부서, actual }));
  const total = byDept.reduce((s, r) => s + r.actual, 0);

  document.getElementById("todayList").innerHTML = deptListHtml(byDept);
  document.getElementById("statTodayValue").textContent = byDept.length ? `${formatNumber(total)}억` : "-";
  document.getElementById("statTodaySub").textContent = byDept.length ? `${label} · ${byDept.length}개 부문` : "데이터 없음";
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
  const byDept = Array.from(sumByDept(rows).entries()).map(([부서, actual]) => ({
    부서,
    actual,
    target: pacedTarget(DEPT_TARGETS[부서]?.분기목표 || 0, start, end, today),
  }));
  const totalActual = byDept.reduce((s, r) => s + r.actual, 0);
  const totalTarget = byDept.reduce((s, r) => s + r.target, 0);

  document.getElementById("quarterList").innerHTML = deptListHtml(byDept, { withMeter: true });
  document.getElementById("statQuarterValue").textContent = byDept.length ? `${pct(totalActual, totalTarget)}%` : "-";
  document.getElementById("statQuarterSub").textContent = byDept.length
    ? `${formatNumber(totalActual)}억 / 진행목표 ${formatNumber(totalTarget)}억`
    : "데이터 없음";
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
  document.getElementById("yearLabel").textContent =
    `${yearStart} ~ ${today} 누적 · 목표는 연 진행률(${Math.round(yearPaceRatio * 100)}%)에 맞춰 보정된 값 · 전분기대비 = 이번 분기(진행중) 누적 vs ${prev.year}년 ${prev.q}분기 전체 실적`;

  const ytdRows = state.history.filter((r) => r.날짜.slice(0, 4) === String(year) && r.날짜 <= today);
  const curQtdByDept = sumByDept(state.history.filter((r) => r.날짜 >= curBounds.start && r.날짜 <= curBounds.end));
  const prevByDept = sumByDept(state.history.filter((r) => r.날짜 >= prevBounds.start && r.날짜 <= prevBounds.end));

  const byDept = Array.from(sumByDept(ytdRows).entries()).map(([부서, actual]) => ({
    부서,
    actual,
    target: pacedTarget(DEPT_TARGETS[부서]?.연목표 || 0, yearStart, yearEnd, today),
    curQtd: curQtdByDept.get(부서) || 0,
    prevVal: prevByDept.get(부서) || 0,
  }));
  const totalActual = byDept.reduce((s, r) => s + r.actual, 0);
  const totalTarget = byDept.reduce((s, r) => s + r.target, 0);

  const list = byDept.length
    ? byDept
        .map((r) => {
          const diff = Math.round(r.curQtd - r.prevVal);
          return `<div class="dept-row">
            <div class="dept-row-head"><span class="dept-name">${escapeHtml(r.부서)}</span><span class="dept-value">${formatNumber(r.actual)}<span class="unit">억원</span></span></div>
            ${meterHtml(r.actual, r.target)}
            <div class="dept-row-foot">${badgeHtml(`${pct(r.actual, r.target)}%`, r.actual >= r.target)}<span class="dept-target">전분기 ${formatNumber(r.prevVal)}억 · ${badgeHtml((diff >= 0 ? "+" : "") + formatNumber(diff), diff >= 0)}</span></div>
          </div>`;
        })
        .join("")
    : `<p class="empty">표시할 데이터가 없습니다.</p>`;

  document.getElementById("yearList").innerHTML = list;
  document.getElementById("statYearValue").textContent = byDept.length ? `${pct(totalActual, totalTarget)}%` : "-";
  document.getElementById("statYearSub").textContent = byDept.length
    ? `${formatNumber(totalActual)}억 / 진행목표 ${formatNumber(totalTarget)}억`
    : "데이터 없음";
}

function renderAll() {
  renderStatus();
  renderToday();
  renderQuarter();
  renderYear();
}

renderAll();
