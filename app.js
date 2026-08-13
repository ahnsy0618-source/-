const state = {
  rows: [],
};

const SAMPLE_ROWS = [
  { 부서: "WM부문 1본부", 월: "2026-06", "목표(억원)": 180, "실적(억원)": 175 },
  { 부서: "WM부문 1본부", 월: "2026-07", "목표(억원)": 185, "실적(억원)": 190 },
  { 부서: "WM부문 2본부", 월: "2026-06", "목표(억원)": 150, "실적(억원)": 145 },
  { 부서: "WM부문 2본부", 월: "2026-07", "목표(억원)": 155, "실적(억원)": 160 },
  { 부서: "WM부문 3본부", 월: "2026-06", "목표(억원)": 120, "실적(억원)": 125 },
  { 부서: "WM부문 3본부", 월: "2026-07", "목표(억원)": 125, "실적(억원)": 118 },
  { 부서: "WM부문 4본부", 월: "2026-06", "목표(억원)": 95, "실적(억원)": 90 },
  { 부서: "WM부문 4본부", 월: "2026-07", "목표(억원)": 98, "실적(억원)": 101 },
  { 부서: "디지털&연금부문", 월: "2026-06", "목표(억원)": 60, "실적(억원)": 58 },
  { 부서: "디지털&연금부문", 월: "2026-07", "목표(억원)": 62, "실적(억원)": 65 },
  { 부서: "S&T부문", 월: "2026-06", "목표(억원)": 210, "실적(억원)": 225 },
  { 부서: "S&T부문", 월: "2026-07", "목표(억원)": 215, "실적(억원)": 198 },
  { 부서: "IB1부문", 월: "2026-06", "목표(억원)": 130, "실적(억원)": 128 },
  { 부서: "IB1부문", 월: "2026-07", "목표(억원)": 135, "실적(억원)": 142 },
  { 부서: "IB2부문", 월: "2026-06", "목표(억원)": 110, "실적(억원)": 105 },
  { 부서: "IB2부문", 월: "2026-07", "목표(억원)": 112, "실적(억원)": 109 },
];

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const sampleBtn = document.getElementById("sampleBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const fileListEl = document.getElementById("fileList");
const resultTableEl = document.getElementById("resultTable");

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
  const withSource = SAMPLE_ROWS.map((r, i) => ({
    ...r,
    __source: `샘플_${r.부서}_${r.월}.xlsx`,
  }));
  state.rows.push(...withSource);
  renderAll();
});

resetBtn.addEventListener("click", () => {
  state.rows = [];
  fileInput.value = "";
  renderAll();
});

function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  let pending = files.length;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        json.forEach((row) => (row.__source = file.name));
        state.rows.push(...json);
      } catch (err) {
        alert(`${file.name} 파일을 읽는 중 오류가 발생했습니다: ${err.message}`);
      } finally {
        pending -= 1;
        if (pending === 0) renderAll();
      }
    };
    reader.readAsBinaryString(file);
  });
}

function isNumericValue(v) {
  if (v === null || v === undefined || v === "") return false;
  return !isNaN(Number(String(v).replace(/,/g, "")));
}

function toNumber(v) {
  return Number(String(v).replace(/,/g, "")) || 0;
}

function formatNumber(n) {
  return Number(n).toLocaleString("ko-KR");
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function aggregate(rows) {
  if (!rows.length) return null;
  const columns = Object.keys(rows[0]).filter((k) => k !== "__source");
  if (!columns.length) return null;
  const keyCol = columns[0];
  const numericCols = columns
    .slice(1)
    .filter((c) => rows.every((r) => r[c] === undefined || r[c] === "" || isNumericValue(r[c])));

  const groupMap = new Map();
  rows.forEach((r) => {
    const key = r[keyCol] === "" || r[keyCol] === undefined ? "(미분류)" : r[keyCol];
    if (!groupMap.has(key)) {
      const init = { [keyCol]: key, __count: 0 };
      numericCols.forEach((c) => (init[c] = 0));
      groupMap.set(key, init);
    }
    const group = groupMap.get(key);
    group.__count += 1;
    numericCols.forEach((c) => (group[c] += toNumber(r[c])));
  });

  return { keyCol, numericCols, groups: Array.from(groupMap.values()) };
}

function renderStatus() {
  const sourceCount = new Set(state.rows.map((r) => r.__source)).size;
  statusEl.textContent = state.rows.length
    ? `${sourceCount}개 파일 · ${state.rows.length}행 업로드됨`
    : "아직 업로드된 데이터가 없습니다.";
}

function renderFileList() {
  const counts = new Map();
  state.rows.forEach((r) => counts.set(r.__source, (counts.get(r.__source) || 0) + 1));
  if (!counts.size) {
    fileListEl.innerHTML = `<li class="empty" style="border:none;padding:0;">아직 업로드된 파일이 없습니다.</li>`;
    return;
  }
  fileListEl.innerHTML = Array.from(counts.entries())
    .map(
      ([name, count]) =>
        `<li><span class="file-name">${escapeHtml(name)}</span><span class="file-count">${count}행</span></li>`
    )
    .join("");
}

function renderResultTable() {
  const agg = aggregate(state.rows);
  if (!agg) {
    resultTableEl.innerHTML = `<p class="empty">표시할 데이터가 없습니다.</p>`;
    return;
  }
  const { keyCol, numericCols, groups } = agg;

  const totalRow = { [keyCol]: "합계", __count: state.rows.length };
  numericCols.forEach((c) => (totalRow[c] = groups.reduce((sum, g) => sum + g[c], 0)));

  const thead = `<tr><th>${escapeHtml(keyCol)}</th>${numericCols
    .map((c) => `<th class="num">${escapeHtml(c)}</th>`)
    .join("")}<th class="num">건수</th></tr>`;

  const bodyRows = groups
    .map(
      (g) =>
        `<tr><td>${escapeHtml(g[keyCol])}</td>${numericCols
          .map((c) => `<td class="num">${formatNumber(g[c])}</td>`)
          .join("")}<td class="num">${g.__count}</td></tr>`
    )
    .join("");

  const footRow = `<tr><td>${escapeHtml(totalRow[keyCol])}</td>${numericCols
    .map((c) => `<td class="num">${formatNumber(totalRow[c])}</td>`)
    .join("")}<td class="num">${totalRow.__count}</td></tr>`;

  resultTableEl.innerHTML = `<table><thead>${thead}</thead><tbody>${bodyRows}</tbody><tfoot>${footRow}</tfoot></table>`;
}

function renderAll() {
  renderStatus();
  renderFileList();
  renderResultTable();
}

renderAll();
