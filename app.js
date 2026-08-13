const HISTORY_KEY = "perf.history";

// 이 대시보드의 "실적(억원)"은 부문 펀더멘털 평가에 쓰이는 부문별 당기순이익 기준.
// (당기순이익은 세금 등이 낀 회사 전체 지표라 부문별로 나누지 않음 — 필요하면 사이드바에 회사 전체 지표로 별도 추가)
// 분기목표 총합(약 3,850억원)은 실제 공시 규모에 맞춘 근사치일 뿐, 부문별 배분·실제 실적치는
// 내부 비공개 자료라 확인할 수 없어 임의로 만든 값 — 실데이터 확보 시 교체 필요.
const DEPT_TARGETS = {
  "WM부문 1본부": { 분기목표: 650, 연목표: 2600 },
  "WM부문 2본부": { 분기목표: 550, 연목표: 2200 },
  "WM부문 3본부": { 분기목표: 450, 연목표: 1800 },
  "WM부문 4본부": { 분기목표: 350, 연목표: 1400 },
  "디지털&연금부문": { 분기목표: 220, 연목표: 900 },
  "S&T부문": { 분기목표: 750, 연목표: 3000 },
  "IB1부문": { 분기목표: 480, 연목표: 1900 },
  "IB2부문": { 분기목표: 400, 연목표: 1600 },
};

// 부서별 과거 당기순이익(억원): 1분기 총, 2분기 총, 7월 총, 8월 주간(월요일 기준, 최근주 포함) — 샘플 데모용
const DEPT_HISTORY_SEED = {
  "WM부문 1본부": { q1: 635, q2: 655, jul: 215, weeks: [["2026-08-03", 62], ["2026-08-10", 67]] },
  "WM부문 2본부": { q1: 540, q2: 565, jul: 180, weeks: [["2026-08-03", 52], ["2026-08-10", 56]] },
  "WM부문 3본부": { q1: 440, q2: 425, jul: 145, weeks: [["2026-08-03", 42], ["2026-08-10", 45]] },
  "WM부문 4본부": { q1: 295, q2: 300, jul: 65, weeks: [["2026-08-03", 14], ["2026-08-10", 12]] },
  "디지털&연금부문": { q1: 215, q2: 220, jul: 70, weeks: [["2026-08-03", 20], ["2026-08-10", 22]] },
  "S&T부문": { q1: 740, q2: 815, jul: 250, weeks: [["2026-08-03", 72], ["2026-08-10", 78]] },
  "IB1부문": { q1: 470, q2: 490, jul: 155, weeks: [["2026-08-03", 45], ["2026-08-10", 48]] },
  "IB2부문": { q1: 395, q2: 400, jul: 130, weeks: [["2026-08-03", 38], ["2026-08-10", 41]] },
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
    ? `${latest}(월) 기준 · 이번 주 당기순이익`
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
    `${yearStart} ~ ${today} 누적 · 목표는 연 진행률(${Math.round(yearPaceRatio * 100)}%)에 맞춰 보정된 값 · 전분기대비 = 이번 분기(진행중) 누적 vs ${prev.year}년 ${prev.q}분기 전체 당기순이익`;

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
        .map((r, i) => {
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

// 기준금리는 자주 안 바뀌고 브라우저에서 직접 붙일 무료 CORS API도 없어서 "기준일" 있는 참고값으로 고정.
// 코스피는 /api/kospi(서버리스 함수)가 야후 파이낸스를 대신 호출해서 실시간으로 가져옴.
// 환율은 open.er-api.com(CORS 허용)으로 실시간 조회.
const BASE_RATE_SNAPSHOT = { value: "2.75%", asOf: "2026-07-16 결정" };

async function loadMarketData() {
  document.getElementById("marketRate").textContent = BASE_RATE_SNAPSHOT.value;
  document.getElementById("marketNote").textContent =
    `기준금리 ${BASE_RATE_SNAPSHOT.asOf} 기준 (실시간 아님) · 코스피·환율은 실시간 조회`;

  try {
    const res = await fetch("/api/kospi");
    const data = await res.json();
    if (!res.ok || !data.price) throw new Error(data.error || "조회 실패");
    const diff = data.price - data.prevClose;
    const status = diff >= 0 ? "good" : "critical";
    const arrow = diff >= 0 ? "▲" : "▼";
    document.getElementById("marketKospi").innerHTML =
      `${data.price.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} <span class="badge badge-${status}" style="margin-left:4px;">${arrow} ${Math.abs(diff).toFixed(2)}</span>`;
  } catch {
    document.getElementById("marketKospi").textContent = "조회 실패";
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    const krw = data?.rates?.KRW;
    document.getElementById("marketFx").textContent = krw ? `${formatNumber(krw)}원` : "-";
  } catch {
    document.getElementById("marketFx").textContent = "조회 실패";
  }
}

// RSS2JSON이 XML 엔티티를 이미 인코딩된 채로 넘겨주는 경우가 있어, escapeHtml 전에 한 번 원복
function decodeBasicEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

async function loadNews() {
  const listEl = document.getElementById("newsList");
  try {
    const rssUrl = encodeURIComponent("https://news.google.com/rss/search?q=삼성증권&hl=ko&gl=KR&ceid=KR:ko");
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
    const data = await res.json();
    const items = (data.items || []).slice(0, 6);
    listEl.innerHTML = items.length
      ? items
          .map(
            (it) => `<div class="news-item">
              <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener">${escapeHtml(decodeBasicEntities(it.title))}</a>
              <span class="news-date">${escapeHtml((it.pubDate || "").slice(0, 16))}</span>
            </div>`
          )
          .join("")
      : `<p class="empty">관련 뉴스가 없습니다.</p>`;
  } catch {
    listEl.innerHTML = `<p class="empty">뉴스를 불러오지 못했습니다.</p>`;
  }
}

renderAll();
loadMarketData();
loadNews();
