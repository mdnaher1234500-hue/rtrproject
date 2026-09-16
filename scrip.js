// Canonical Default Roll Numbers
const DEFAULT_ROLLS = [
  "D0","D1","D2","D3","D4","D5","D6","D7","D8","D9",
  "E0","E1","E2","E3","E4","E5","E6","E7","E8","E9",
  "F0","F1","F2","F3","F4","F5","F6","F7","F8","F9",
  "G0","G1","G2","G3","G4","G5","G6","G7","G8","G9",
  "H0","H1","H2","H3","H4","H5","H6","H7","H8","H9",
  "J0","J1","J2","J3","J4","J5","J6","J7","J8","J9",
  "K0","K1","K2","K3",
  "L13","L14","L15","L16","L18",
  "77"
];

const STORAGE_PREFIX = "attendance_rolls_";
let currentRolls = [];
let absent = new Set();
let editingRollIndex = -1; // -1 for Add, >= 0 for Edit

// Helper: Get active class name
function getCurrentClass() {
  const subjectInput = document.getElementById("subject");
  return (subjectInput && subjectInput.value ? subjectInput.value.trim().toUpperCase() : "CSM-C") || "CSM-C";
}

// Storage Helpers
function getRollsForClass(className) {
  try {
    const saved = localStorage.getItem(STORAGE_PREFIX + className);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading roll configuration:", e);
  }
  return [...DEFAULT_ROLLS];
}

function saveRollsForClass(className, rolls) {
  try {
    localStorage.setItem(STORAGE_PREFIX + className, JSON.stringify(rolls));
  } catch (e) {
    console.error("Error saving roll configuration:", e);
  }
}

function resetRollsForClass(className) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + className);
  } catch (e) {
    console.error("Error resetting roll configuration:", e);
  }
}

// Load rolls for current class
function loadCurrentClassRolls() {
  const cls = getCurrentClass();
  currentRolls = getRollsForClass(cls);
  // Clean absent set to only retain valid rolls in currentRolls
  const validSet = new Set(currentRolls);
  absent = new Set([...absent].filter(r => validSet.has(r)));
}

// Attendance Grid Generation
function generateRolls() {
  const container = document.getElementById("rollContainer");
  container.innerHTML = "";
  loadCurrentClassRolls();

  currentRolls.forEach(roll => {
    const btn = document.createElement("button");
    btn.textContent = roll;
    btn.className = "roll-btn" + (absent.has(roll) ? " absent" : "");

    btn.onclick = () => {
      if (absent.has(roll)) {
        absent.delete(roll);
        btn.classList.remove("absent");
      } else {
        absent.add(roll);
        btn.classList.add("absent");
      }
      updateSummary();
    };

    container.appendChild(btn);
  });

  updateSummary();
}

// Summary and Register Generation
function updateSummary() {
  const total = currentRolls.length;
  const absentCount = absent.size;
  const present = total - absentCount;

  document.getElementById("total").textContent = total;
  document.getElementById("present").textContent = present;
  document.getElementById("absentCount").textContent = absentCount;

  const subject = getCurrentClass();
  const dateVal = document.getElementById("date").value;
  const sessionRadio = document.querySelector('input[name="session"]:checked');
  const session = sessionRadio ? sessionRadio.value : "FORENOON";

  function formatDate(input) {
    if (!input) return "Date";
    const d = new Date(input);
    if (isNaN(d)) return input;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  const date = formatDate(dateVal);
  const absList = Array.from(absent).sort().join(", ") || "None";
  const percentVal = total > 0 ? (present / total) * 100 : 0;
  const percentage = Number.isInteger(percentVal) ? percentVal : percentVal.toFixed(2);

  document.getElementById("output").value =
`${session} ATTENDANCE – ${subject}

Date: ${date}

Absentees: ${absList}

Present: ${present}
Absent: ${absentCount}
Total: ${total}

Attendance: ${percentage}%`;
}

// Copy Attendance Text
function copyText() {
  const text = document.getElementById("output").value;
  navigator.clipboard.writeText(text).then(() => {
    alert("Attendance copied!");
  }).catch(err => {
    console.error(err);
    alert("Copy failed. Select the text and copy manually.");
  });
}

// --- Roll Number Management Modal Logic ---

function openRollManager() {
  const cls = getCurrentClass();
  document.getElementById("modalClassBadge").textContent = cls;
  const searchInput = document.getElementById("rollSearchInput");
  if (searchInput) searchInput.value = "";
  renderRollList();
  document.getElementById("settingsModal").style.display = "flex";
}

function closeRollManager() {
  document.getElementById("settingsModal").style.display = "none";
  generateRolls();
}

function handleRollSearch(term) {
  renderRollList(term);
}

function renderRollList(filterTerm = "") {
  const tbody = document.getElementById("rollTableBody");
  tbody.innerHTML = "";
  const filter = filterTerm.trim().toUpperCase();

  currentRolls.forEach((roll, index) => {
    if (filter && !roll.toUpperCase().includes(filter)) {
      return;
    }

    const tr = document.createElement("tr");

    // Index column
    const tdIndex = document.createElement("td");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // Roll name column
    const tdRoll = document.createElement("td");
    tdRoll.innerHTML = `<span class="roll-badge">${roll}</span>`;
    tr.appendChild(tdRoll);

    // Reorder column (Up / Down)
    const tdReorder = document.createElement("td");
    tdReorder.className = "reorder-cell";

    const upBtn = document.createElement("button");
    upBtn.className = "btn-icon";
    upBtn.title = "Move Up";
    upBtn.textContent = "▲";
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveRoll(index, -1);

    const downBtn = document.createElement("button");
    downBtn.className = "btn-icon";
    downBtn.title = "Move Down";
    downBtn.textContent = "▼";
    downBtn.disabled = index === currentRolls.length - 1;
    downBtn.onclick = () => moveRoll(index, 1);

    tdReorder.appendChild(upBtn);
    tdReorder.appendChild(downBtn);
    tr.appendChild(tdReorder);

    // Actions column (Edit / Delete)
    const tdActions = document.createElement("td");
    tdActions.className = "actions-cell";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-sm btn-edit";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openEditRollModal(index);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-sm btn-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteRoll(index);

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  if (tbody.children.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "no-data";
    td.textContent = filter ? "No matching roll numbers found." : "No roll numbers configured.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// Add Roll Modal
function openAddRollModal() {
  editingRollIndex = -1;
  document.getElementById("rollEditModalTitle").textContent = "Add Roll Number";
  const rollInput = document.getElementById("rollInput");
  rollInput.value = "";
  clearRollInputError();
  document.getElementById("rollEditModal").style.display = "flex";
  rollInput.focus();
}

// Edit Roll Modal
function openEditRollModal(index) {
  editingRollIndex = index;
  document.getElementById("rollEditModalTitle").textContent = "Edit Roll Number";
  const rollInput = document.getElementById("rollInput");
  rollInput.value = currentRolls[index];
  clearRollInputError();
  document.getElementById("rollEditModal").style.display = "flex";
  rollInput.focus();
}

function closeRollEditModal() {
  document.getElementById("rollEditModal").style.display = "none";
}

function clearRollInputError() {
  const errorEl = document.getElementById("rollInputError");
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

function showRollInputError(msg) {
  const errorEl = document.getElementById("rollInputError");
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

// Save Roll (Add or Edit)
function saveRollNumber() {
  const rollInput = document.getElementById("rollInput");
  const val = rollInput.value.trim();

  if (!val) {
    showRollInputError("Roll number cannot be empty.");
    return;
  }

  // Check uniqueness within class (excluding self when editing)
  const isDuplicate = currentRolls.some((r, idx) => {
    if (editingRollIndex >= 0 && idx === editingRollIndex) return false;
    return r.toUpperCase() === val.toUpperCase();
  });

  if (isDuplicate) {
    showRollInputError(`Roll number "${val}" already exists in this class.`);
    return;
  }

  const cls = getCurrentClass();

  if (editingRollIndex === -1) {
    // Add new
    currentRolls.push(val);
  } else {
    // Edit existing
    const oldRoll = currentRolls[editingRollIndex];
    currentRolls[editingRollIndex] = val;

    // Preserve absent record
    if (absent.has(oldRoll)) {
      absent.delete(oldRoll);
      absent.add(val);
    }
  }

  saveRollsForClass(cls, currentRolls);
  closeRollEditModal();
  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);
  generateRolls();
}

// Delete Roll
function deleteRoll(index) {
  const rollToDelete = currentRolls[index];
  const confirmed = confirm(`Are you sure you want to delete roll number "${rollToDelete}"?`);
  if (!confirmed) return;

  absent.delete(rollToDelete);
  currentRolls.splice(index, 1);

  const cls = getCurrentClass();
  saveRollsForClass(cls, currentRolls);

  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);
  generateRolls();
}

// Move Roll (Reordering)
function moveRoll(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentRolls.length) return;

  const temp = currentRolls[index];
  currentRolls[index] = currentRolls[targetIndex];
  currentRolls[targetIndex] = temp;

  const cls = getCurrentClass();
  saveRollsForClass(cls, currentRolls);

  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);
  generateRolls();
}

// Reset to Default
function handleResetRolls() {
  const cls = getCurrentClass();
  const confirmed = confirm(`Are you sure you want to reset roll numbers to default for "${cls}"?`);
  if (!confirmed) return;

  resetRollsForClass(cls);
  currentRolls = getRollsForClass(cls);

  // Clean absent set to valid items
  const validSet = new Set(currentRolls);
  absent = new Set([...absent].filter(r => validSet.has(r)));

  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);
  generateRolls();
}

// Auto-generate rolls on page load & setup listeners
window.onload = () => {
  // set today's date if not provided
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Subject change listener: reload class-specific rolls
  document.getElementById('subject')?.addEventListener('input', () => {
    generateRolls();
  });

  document.getElementById('date')?.addEventListener('change', updateSummary);
  document.querySelectorAll('input[name="session"]').forEach(radio => {
    radio.addEventListener('change', updateSummary);
  });

  // Enter key support on Add/Edit roll input
  document.getElementById('rollInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveRollNumber();
    }
  });

  loadCurrentClassRolls();
  generateRolls();
};

