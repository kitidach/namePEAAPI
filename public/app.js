/**
 * PEA Data Retrieval — Frontend Application
 * Consumes the backend API at /api/v1
 */

const API_BASE = "/api/v1";

// ─── State ──────────────────────────────────────────────────────────
const state = {
  q: "",
  size: "",
  parent8: "",
  groupCode: "",
  page: 1,
  limit: 50,
  sort: "index",
  order: "asc",
  currentTab: "table",
  hierarchyData: null,
  statsData: null,
  filteredTotal: 0,
  exporting: false,
};

// ─── API Helpers ────────────────────────────────────────────────────
async function apiFetch(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ─── Debounce ───────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ─── Filter Params Helper (single source of truth) ───────────────────
function buildFilterParams() {
  const p = {};
  if (state.q) p.q = state.q;
  if (state.size) p.size = state.size;
  if (state.parent8) p.parent8 = state.parent8;
  if (state.groupCode) p.groupCode = state.groupCode;
  if (state.sort && state.sort !== "index") p.sort = state.sort;
  if (state.order && state.order !== "asc") p.order = state.order;
  return p;
}

// ─── Export ──────────────────────────────────────────────────────────
function updateExportButtons() {
  const csvBtn = document.getElementById("exportCsv");
  const jsonBtn = document.getElementById("exportJson");
  if (!csvBtn || !jsonBtn) return;

  const disabled = state.filteredTotal === 0 || state.exporting;
  csvBtn.disabled = disabled;
  jsonBtn.disabled = disabled;

  if (state.filteredTotal === 0 && !state.exporting) {
    csvBtn.title = "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e2b\u0e49 export";
    jsonBtn.title = "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e2b\u0e49 export";
  } else {
    csvBtn.title = "\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14 CSV";
    jsonBtn.title = "\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14 JSON";
  }
}

async function exportData(format) {
  if (state.exporting || state.filteredTotal === 0) return;

  const csvBtn = document.getElementById("exportCsv");
  const jsonBtn = document.getElementById("exportJson");
  const activeBtn = format === "csv" ? csvBtn : jsonBtn;
  const origCSV = csvBtn.innerHTML;
  const origJSON = jsonBtn.innerHTML;

  // Lock both buttons
  state.exporting = true;
  csvBtn.disabled = true;
  jsonBtn.disabled = true;
  activeBtn.innerHTML = "\u23F3 ...";

  try {
    // Build export URL
    const url = new URL(API_BASE + "/export/offices", window.location.origin);
    url.searchParams.set("format", format);
    const filters = buildFilterParams();
    Object.entries(filters).forEach(([k, v]) => url.searchParams.set(k, v));

    // Fetch as blob for proper download control
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Export failed (${res.status})`);

    // Extract filename from Content-Disposition or build fallback
    let filename = `pea-offices.${format}`;
    const cd = res.headers.get("Content-Disposition");
    if (cd) {
      const match = cd.match(/filename="?([^";\s]+)"?/);
      if (match) filename = match[1];
    }

    // Download via blob
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    // Success feedback with count from tracked state
    activeBtn.innerHTML = "\u2705 " + state.filteredTotal + " \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23";
    setTimeout(() => {
      csvBtn.innerHTML = origCSV;
      jsonBtn.innerHTML = origJSON;
      state.exporting = false;
      updateExportButtons();
    }, 2000);

  } catch (e) {
    console.error("Export error:", e);
    activeBtn.innerHTML = "\u274C Error";
    setTimeout(() => {
      csvBtn.innerHTML = origCSV;
      jsonBtn.innerHTML = origJSON;
      state.exporting = false;
      updateExportButtons();
    }, 2000);
  }
}

// ─── Stats ──────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await apiFetch("/stats");
    state.statsData = res.data;
    renderStats(res.data);
    document.getElementById("headerSubtitle").textContent =
      `การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคตะวันออกเฉียงเหนือ) — ${res.data.totalOffices} สำนักงาน`;
  } catch (e) {
    console.error("Stats error:", e);
  }
}

function renderStats(data) {
  const row = document.getElementById("statsRow");
  const cards = [
    { label: "ทั้งหมด", value: data.totalOffices, cls: "", filter: "all" },
    { label: "L — ใหญ่", value: data.bySize.L, cls: "size-L", filter: "size:L" },
    { label: "M — กลาง", value: data.bySize.M, cls: "size-M", filter: "size:M" },
    { label: "S — เล็ก", value: data.bySize.S, cls: "size-S", filter: "size:S" },
    { label: "XS — เล็กพิเศษ", value: data.bySize.XS, cls: "size-XS", filter: "size:XS" },
    { label: "8 กฟจ.", value: data.totalGroups8, cls: "", filter: "group:8" },
    { label: "17 จุดรวมงาน", value: data.totalGroups17, cls: "", filter: "group:17" },
    { label: "43 กฟฟ.", value: data.totalGroups43, cls: "", filter: "group:43" },
  ];
  row.innerHTML = cards
    .map(
      (c) => `
    <div class="stat-card ${c.cls} clickable" data-filter="${c.filter}" onclick="filterByStat('${c.filter}')">
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>`
    )
    .join("");
}

function filterByStat(filter) {
  // Show group popup
  if (filter.startsWith("group:")) {
    const level = filter.split(":")[1];
    showGroupPopup(level);
    highlightStatCard(filter);
    return;
  }

  // Ensure table tab is active
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  const tableBtn = document.querySelector('.tab-btn[data-tab="table"]');
  if (tableBtn) { tableBtn.classList.add("active"); }
  document.getElementById("tableView").style.display = "";
  document.getElementById("treeView").style.display = "none";
  document.getElementById("controlsPanel").style.display = "";
  state.currentTab = "table";

  if (filter === "all") {
    state.size = "";
    state.parent8 = "";
    state.groupCode = "";
    state.q = "";
    document.getElementById("filterSize").value = "";
    document.getElementById("filterGroup8").value = "";
    document.getElementById("filterGroupCode").value = "";
    document.getElementById("searchInput").value = "";
  } else if (filter.startsWith("size:")) {
    const size = filter.split(":")[1];
    state.size = size;
    document.getElementById("filterSize").value = size;
  }

  state.page = 1;
  loadTable();
  highlightStatCard(filter);
}

async function showGroupPopup(level) {
  const overlay = document.getElementById("detailOverlay");
  const card = document.getElementById("detailCard");
  const titles = {
    "8": "8 \u0e01\u0e1f\u0e08. (\u0e01\u0e32\u0e23\u0e44\u0e1f\u0e1f\u0e49\u0e32\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14)",
    "17": "17 \u0e08\u0e38\u0e14\u0e23\u0e27\u0e21\u0e07\u0e32\u0e19",
    "43": "43 \u0e01\u0e1f\u0e1f. (\u0e01\u0e32\u0e23\u0e44\u0e1f\u0e1f\u0e49\u0e32\u0e2a\u0e32\u0e02\u0e32\u0e22\u0e48\u0e2d\u0e22)"
  };

  card.innerHTML = '<div class="loading"><div class="spinner"></div><br>\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14...</div>';
  overlay.classList.add("show");

  try {
    const [res, statsRes] = await Promise.all([
      apiFetch("/groups/" + level),
      apiFetch("/stats")
    ]);
    const groups = res.data;
    const byGroup8 = statsRes.data.byGroup8 || {};
    const byGroupCode = statsRes.data.byGroupCode || {};
    const showCount = (level === "8" || level === "17");

    let tableRows = "";
    groups.forEach((g, i) => {
      let count = 0;
      if (level === "8") count = byGroup8[g.name] || 0;
      else if (level === "17") count = byGroupCode[g.code] || 0;

      const clickId = g.id || "";
      const clickCode = g.code || "";
      tableRows += `
        <tr class="group-row" onclick="filterGroupFromPopup('${level}','${clickId}','${clickCode}')">
          <td style="color:var(--text-muted);width:30px">${i + 1}</td>
          <td style="font-weight:600">${g.shortName || g.name}</td>
          <td>${g.name}</td>
          ${showCount ? '<td style="text-align:center;color:var(--accent)">' + count + ' \u0e2a\u0e19\u0e07.</td>' : ''}
        </tr>`;
    });

    card.innerHTML = `
      <button class="close-btn" onclick="closeDetail()">&times;</button>
      <h2>${titles[level] || "\u0e01\u0e25\u0e38\u0e48\u0e21 " + level}</h2>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">
        \u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 ${groups.length} \u0e01\u0e25\u0e38\u0e48\u0e21 \u2014 \u0e01\u0e14\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d filter \u0e15\u0e32\u0e23\u0e32\u0e07
      </p>
      <div class="export-group" style="margin-bottom:16px">
        <span class="export-label">Export:</span>
        <button class="export-btn" onclick="exportData('csv')">
          <span class="export-icon">&#128196;</span> CSV
        </button>
        <button class="export-btn" onclick="exportData('json')">
          <span class="export-icon">{}</span> JSON
        </button>
      </div>
      <table class="group-popup-table">
        <thead><tr><th>#</th><th>\u0e0a\u0e37\u0e48\u0e2d\u0e22\u0e48\u0e2d</th><th>\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e15\u0e47\u0e21</th>${showCount ? '<th>\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19</th>' : ''}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;
  } catch (e) {
    card.innerHTML = '<button class="close-btn" onclick="closeDetail()">&times;</button>' +
      '<div class="error-state">\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e42\u0e2b\u0e25\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25: ' + e.message + '</div>';
  }
}

function filterGroupFromPopup(level, id, code) {
  closeDetail();
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  const tableBtn = document.querySelector('.tab-btn[data-tab="table"]');
  if (tableBtn) { tableBtn.classList.add("active"); }
  document.getElementById("tableView").style.display = "";
  document.getElementById("treeView").style.display = "none";
  document.getElementById("controlsPanel").style.display = "";
  state.currentTab = "table";
  state.q = "";
  state.size = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("filterSize").value = "";

  if (level === "8") {
    state.parent8 = id;
    state.groupCode = "";
    document.getElementById("filterGroup8").value = id;
    document.getElementById("filterGroupCode").value = "";
  } else {
    state.groupCode = code;
    state.parent8 = "";
    document.getElementById("filterGroupCode").value = code;
    document.getElementById("filterGroup8").value = "";
  }
  state.page = 1;
  loadTable();
}

function highlightStatCard(activeFilter) {
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.filter === activeFilter);
  });
}

// ─── Filter Dropdowns ───────────────────────────────────────────────
async function loadFilters() {
  try {
    // Load Group8 for filter
    const g8res = await apiFetch("/groups/8");
    const sel8 = document.getElementById("filterGroup8");
    g8res.data.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.shortName || g.name}`;
      sel8.appendChild(opt);
    });

    // Load Group17 for filter
    const g17res = await apiFetch("/groups/17");
    const selGC = document.getElementById("filterGroupCode");
    g17res.data.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.code;
      opt.textContent = `${g.shortName || g.name}`;
      selGC.appendChild(opt);
    });
  } catch (e) {
    console.error("Filter load error:", e);
  }
}

// ─── Table ──────────────────────────────────────────────────────────
async function loadTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `<tr><td colspan="8" class="loading"><div class="spinner"></div><br>กำลังโหลด...</td></tr>`;

  try {
    const res = await apiFetch("/offices", {
      q: state.q,
      size: state.size,
      parent8: state.parent8,
      groupCode: state.groupCode,
      page: state.page,
      limit: state.limit,
      sort: state.sort,
      order: state.order,
    });

    const offices = res.data;
    const meta = res.meta;

    state.filteredTotal = meta.total;
    updateExportButtons();

    document.getElementById("resultCount").textContent =
      `${meta.total} รายการ`;

    if (offices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">ไม่พบข้อมูล</td></tr>`;
      document.getElementById("pagination").innerHTML = "";
      return;
    }

    tbody.innerHTML = offices
      .map(
        (o) => `
      <tr data-code="${o.code}">
        <td>${o.index ?? "-"}</td>
        <td style="color: var(--accent); font-weight: 500;">${o.code}</td>
        <td style="font-weight: 600;">${o.shortName}</td>
        <td>${o.fullName}</td>
        <td><span class="size-badge ${o.size}">${o.size}</span></td>
        <td>${o.parent43Name}</td>
        <td>${o.parent17Name}</td>
        <td>${o.parent8Name}</td>
      </tr>`
      )
      .join("");

    renderPagination(meta);
    updateSortHeaders();
  } catch (e) {
    console.error("Table error:", e);
    state.filteredTotal = 0;
    updateExportButtons();
    tbody.innerHTML = `<tr><td colspan="8" class="error-state">เกิดข้อผิดพลาด: ${e.message}</td></tr>`;
  }
}

function renderPagination(meta) {
  const div = document.getElementById("pagination");
  if (meta.totalPages <= 1) {
    div.innerHTML = "";
    return;
  }
  div.innerHTML = `
    <button ${meta.page <= 1 ? "disabled" : ""} onclick="goPage(1)">&#171;</button>
    <button ${meta.page <= 1 ? "disabled" : ""} onclick="goPage(${meta.page - 1})">&#8249;</button>
    <span class="page-info">หน้า ${meta.page} / ${meta.totalPages}</span>
    <button ${meta.page >= meta.totalPages ? "disabled" : ""} onclick="goPage(${meta.page + 1})">&#8250;</button>
    <button ${meta.page >= meta.totalPages ? "disabled" : ""} onclick="goPage(${meta.totalPages})">&#187;</button>
  `;
}

function goPage(p) {
  state.page = p;
  loadTable();
}

function updateSortHeaders() {
  document.querySelectorAll(".results-table th[data-sort]").forEach((th) => {
    const key = th.dataset.sort;
    const arrow = th.querySelector(".sort-arrow");
    if (key === state.sort) {
      th.classList.add("sorted");
      arrow.textContent = state.order === "asc" ? "▲" : "▼";
    } else {
      th.classList.remove("sorted");
      arrow.textContent = "";
    }
  });
}

// ─── Detail Modal ───────────────────────────────────────────────────
async function showDetail(code) {
  const overlay = document.getElementById("detailOverlay");
  const card = document.getElementById("detailCard");

  card.innerHTML = `<div class="loading"><div class="spinner"></div><br>กำลังโหลด...</div>`;
  overlay.classList.add("show");

  try {
    const [officeRes, pathRes] = await Promise.all([
      apiFetch(`/offices/${code}`),
      apiFetch(`/offices/${code}/path`),
    ]);

    const o = officeRes.data;
    const p = pathRes.data;

    card.innerHTML = `
      <button class="close-btn" onclick="closeDetail()">&times;</button>
      <h2>${o.fullName}</h2>
      <div class="detail-code">${o.code} &middot; <span class="size-badge ${o.size}">${o.size}</span></div>
      
      <div class="detail-section">
        <h3>ข้อมูลพื้นฐาน</h3>
        <div class="detail-grid">
          <span class="label">รหัส</span><span class="value">${o.code}</span>
          <span class="label">ชื่อย่อ</span><span class="value">${o.shortName}</span>
          <span class="label">ชื่อเต็ม</span><span class="value">${o.fullName}</span>
          <span class="label">ระดับ</span><span class="value"><span class="size-badge ${o.size}">${o.size}</span></span>
          <span class="label">ลำดับ</span><span class="value">${o.index ?? "-"}</span>
          <span class="label">ชื่อย่ออื่น</span><span class="value">${o.aliases.length ? o.aliases.join(", ") : "-"}</span>
          <span class="label">รหัสกลุ่ม</span><span class="value">${o.groupCode} (กลุ่ม ${o.groupNum ?? "-"})</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>สายสังกัด (เล็ก → ใหญ่)</h3>
        <div class="hierarchy-path">
          <div class="path-item" style="--depth: 4">
            <div class="path-dot" style="background: var(--size-${o.size})"></div>
            <span class="path-type">สำนักงาน</span>
            <strong>${o.shortName}</strong> — ${o.fullName}
          </div>
          ${p.group43 ? `
          <div class="path-item" style="--depth: 3">
            <div class="path-dot" style="background: #60a5fa"></div>
            <span class="path-type">43 กฟฟ.</span>
            ${p.group43.shortName || p.group43.name}
          </div>` : ""}
          ${p.group17 ? `
          <div class="path-item" style="--depth: 2">
            <div class="path-dot" style="background: #a78bfa"></div>
            <span class="path-type">17 จุดรวม</span>
            ${p.group17.shortName || p.group17.name}
          </div>` : ""}
          ${p.group8 ? `
          <div class="path-item" style="--depth: 1">
            <div class="path-dot" style="background: #818cf8"></div>
            <span class="path-type">8 กฟจ.</span>
            ${p.group8.shortName || p.group8.name}
          </div>` : ""}
          <div class="path-item" style="--depth: 0">
            <div class="path-dot" style="background: var(--accent)"></div>
            <span class="path-type">เขต</span>
            ${p.region.shortName}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    card.innerHTML = `<button class="close-btn" onclick="closeDetail()">&times;</button>
      <div class="error-state">ไม่สามารถโหลดข้อมูล: ${e.message}</div>`;
  }
}

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("show");
}

// ─── Hierarchy Tree ─────────────────────────────────────────────────
async function loadTree() {
  const container = document.getElementById("treeContainer");
  if (state.hierarchyData) {
    renderTree(state.hierarchyData);
    return;
  }

  container.innerHTML = `<div class="loading"><div class="spinner"></div><br>กำลังโหลดโครงสร้าง...</div>`;

  try {
    const res = await apiFetch("/hierarchy");
    state.hierarchyData = res.data;
    renderTree(res.data);
  } catch (e) {
    container.innerHTML = `<div class="error-state">เกิดข้อผิดพลาด: ${e.message}</div>`;
  }
}

function renderTree(data) {
  const container = document.getElementById("treeContainer");
  let html = `<div class="tree-node-header" style="padding-left: 0; font-weight: 600; color: var(--accent);">
    &#9733; ${data.region.shortName} — ${data.region.name}
  </div>`;

  for (const g8 of data.children || []) {
    html += renderTreeNode(g8, 0);
  }
  container.innerHTML = html;
}

function renderTreeNode(node, depth) {
  const hasChildren = node.children && node.children.length > 0;
  const id = `tree_${node.id || node.code || Math.random().toString(36).substr(2, 6)}`;
  const typeBadge = node.type ? `<span class="tree-type-badge ${node.type}">${getTypeLabel(node.type)}</span>` : "";
  const sizeHtml = node.size ? `<span class="size-badge ${node.size}">${node.size}</span>` : "";
  const name = node.fullName || node.name || node.shortName;
  const short = node.shortName && node.shortName !== name ? `(${node.shortName})` : "";
  const codeHtml = node.code ? `<span style="color: var(--text-muted); font-size: 11px;">${node.code}</span>` : "";

  let html = `
    <div class="tree-node" style="margin-left: ${depth * 12}px">
      <div class="tree-node-header" onclick="${hasChildren ? `toggleTree('${id}')` : `showDetail('${node.code}')`}">
        ${hasChildren ? `<span class="tree-toggle" id="toggle_${id}">&#9654;</span>` : `<span style="width:16px; display:inline-block"></span>`}
        ${typeBadge} ${sizeHtml} ${name} ${short} ${codeHtml}
      </div>`;

  if (hasChildren) {
    html += `<div class="tree-children" id="children_${id}">`;
    for (const child of node.children) {
      html += renderTreeNode(child, depth + 1);
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function getTypeLabel(type) {
  const labels = { group8: "กฟจ.", group17: "17", group43: "43", office: "สนง." };
  return labels[type] || type;
}

function toggleTree(id) {
  const children = document.getElementById("children_" + id);
  const toggle = document.getElementById("toggle_" + id);
  if (children) {
    children.classList.toggle("open");
    toggle.classList.toggle("open");
  }
}

// ─── Event Listeners ────────────────────────────────────────────────
function init() {
  // Search
  const searchInput = document.getElementById("searchInput");
  const debouncedSearch = debounce(() => {
    state.q = searchInput.value;
    state.page = 1;
    loadTable();
  }, 300);
  searchInput.addEventListener("input", debouncedSearch);

  // Filters
  document.getElementById("filterSize").addEventListener("change", (e) => {
    state.size = e.target.value;
    state.page = 1;
    loadTable();
  });
  document.getElementById("filterGroup8").addEventListener("change", (e) => {
    state.parent8 = e.target.value;
    state.page = 1;
    loadTable();
  });
  document.getElementById("filterGroupCode").addEventListener("change", (e) => {
    state.groupCode = e.target.value;
    state.page = 1;
    loadTable();
  });

  // Sort
  document.querySelectorAll(".results-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sort === key) {
        state.order = state.order === "asc" ? "desc" : "asc";
      } else {
        state.sort = key;
        state.order = "asc";
      }
      state.page = 1;
      loadTable();
    });
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      state.currentTab = tab;
      document.getElementById("tableView").style.display = tab === "table" ? "" : "none";
      document.getElementById("treeView").style.display = tab === "tree" ? "" : "none";
      document.getElementById("controlsPanel").style.display = tab === "table" ? "" : "none";
      if (tab === "tree") loadTree();
    });
  });

  // Table row click
  document.getElementById("tableBody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-code]");
    if (tr) showDetail(tr.dataset.code);
  });

  // Close modal on overlay click
  document.getElementById("detailOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDetail();
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail();
  });

  // Initial load
  loadStats();
  loadFilters();
  loadTable();
}

// Make functions available globally for inline onclick handlers
window.goPage = goPage;
window.showDetail = showDetail;
window.closeDetail = closeDetail;
window.toggleTree = toggleTree;
window.filterByStat = filterByStat;
window.filterGroupFromPopup = filterGroupFromPopup;
window.exportData = exportData;
window.runGroupTool = runGroupTool;
window.copyGroupResult = copyGroupResult;

// ─── Group Tool ─────────────────────────────────────────────────────
async function runGroupTool() {
  const input = document.getElementById("groupInput").value.trim();
  const btn = document.getElementById("groupSubmitBtn");
  const resultDiv = document.getElementById("groupResult");
  const outputPre = document.getElementById("groupOutput");
  const detailDiv = document.getElementById("groupDetail");

  if (!input) return;

  btn.disabled = true;
  btn.textContent = "\u23F3 \u0e01\u0e33\u0e25\u0e31\u0e07\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e1c\u0e25...";

  try {
    const url = new URL(API_BASE + "/tools/group-offices", window.location.origin);
    url.searchParams.set("names", input);
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error?.message || "API error");
    }

    const data = json.data;
    outputPre.textContent = data.formatted;
    resultDiv.style.display = "block";

    // Detail section
    let detail = `\u0e1e\u0e1a ${json.meta.foundCount}/${json.meta.inputCount} \u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19`;
    if (data.notFound.length > 0) {
      detail += `<div class="notfound">\u26A0 \u0e44\u0e21\u0e48\u0e1e\u0e1a: ${data.notFound.join(", ")}</div>`;
    }
    detailDiv.innerHTML = detail;

  } catch (e) {
    outputPre.textContent = "\u274C " + e.message;
    resultDiv.style.display = "block";
    detailDiv.innerHTML = "";
  } finally {
    btn.disabled = false;
    btn.textContent = "\u0e08\u0e31\u0e14\u0e01\u0e25\u0e38\u0e48\u0e21";
  }
}

function copyGroupResult() {
  const text = document.getElementById("groupOutput").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("groupCopyBtn");
    btn.textContent = "\u2705 Copied!";
    setTimeout(() => { btn.textContent = "\uD83D\uDCCB Copy"; }, 1500);
  });
}

// Close group overlay on backdrop click
document.addEventListener("click", (e) => {
  const overlay = document.getElementById("groupToolOverlay");
  if (e.target === overlay) overlay.style.display = "none";
});

document.addEventListener("DOMContentLoaded", init);
