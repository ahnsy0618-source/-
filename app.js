const state = {
  rows: [],
};

const SAMPLE_ROWS = [
  { 부서: "리테일영업1팀", 월: "2026-06", 목표: 12000, 실적: 11800 },
  { 부서: "리테일영업1팀", 월: "2026-07", 목표: 12500, 실적: 13100 },
  { 부서: "IB사업부", 월: "2026-06", 목표: 8000, 실적: 7600 },
  { 부서: "IB사업부", 월: "2026-07", 목표: 8500, 실적: 9000 },
  { 부서: "트레이딩부", 월: "2026-06", 목표: 15000, 실적: 16200 },
  { 부서: "트레이딩부", 월: "2026-07", 목표: 15500, 실적: 14800 },
  { 부서: "WM사업부", 월: "2026-06", 목표: 6000, 실적: 5700 },
  { 부서: "WM사업부", 월: "2026-07", 목표: 6200, 실적: 6500 },
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
