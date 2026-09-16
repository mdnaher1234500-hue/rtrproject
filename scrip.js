// =========================================================
// RTR College Attendance Management - Multi-Class System
// =========================================================

// Canonical Default CSM-C Roll Numbers (Preserved exactly as configured: 69 rolls)
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

// Storage Keys
const CLASSES_LIST_KEY = "attendance_classes_list";
const ROLLS_STORAGE_PREFIX = "attendance_rolls_";
const RECORD_STORAGE_PREFIX = "attendance_rec_";
const ACTIVE_CLASS_KEY = "attendance_active_class";
const DEFAULT_CLASS = "CSM-C";

// Application State
let classesList = [];
let activeClass = DEFAULT_CLASS;
let modalActiveClass = DEFAULT_CLASS;
let currentRolls = [];
let currentAbsentSet = new Set();
let editingRollIndex = -1;
let editingClassName = "";
let currentSettingsTab = "rolls";

// =========================================================
// Storage & Migration Helpers
// =========================================================

function initClassSystem() {
  try {
    // 1. Load or initialize classes list
    const savedClasses = localStorage.getItem(CLASSES_LIST_KEY);
    if (savedClasses) {
      const parsed = JSON.parse(savedClasses);
      if (Array.isArray(parsed) && parsed.length > 0) {
        classesList = parsed;
      } else {
        classesList = [DEFAULT_CLASS];
      }
    } else {
      classesList = [DEFAULT_CLASS];
      saveClassesList(classesList);
    }

    // 2. Ensure CSM-C has its roll numbers preserved
    const csmcRolls = localStorage.getItem(ROLLS_STORAGE_PREFIX + DEFAULT_CLASS);
    if (!csmcRolls) {
      saveRollsForClass(DEFAULT_CLASS, DEFAULT_ROLLS);
    }

    // 3. Load active class
    const savedActive = localStorage.getItem(ACTIVE_CLASS_KEY);
    if (savedActive && classesList.includes(savedActive)) {
      activeClass = savedActive;
    } else {
      activeClass = classesList[0] || DEFAULT_CLASS;
      localStorage.setItem(ACTIVE_CLASS_KEY, activeClass);
    }

    modalActiveClass = activeClass;
  } catch (e) {
    console.error("Initialization error:", e);
    classesList = [DEFAULT_CLASS];
    activeClass = DEFAULT_CLASS;
    modalActiveClass = DEFAULT_CLASS;
  }
}

function getAllClasses() {
  return [...classesList];
}

function saveClassesList(list) {
  try {
    localStorage.setItem(CLASSES_LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Error saving classes list:", e);
  }
}

function getRollsForClass(className) {
  try {
    const saved = localStorage.getItem(ROLLS_STORAGE_PREFIX + className);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(`Error reading roll configuration for ${className}:`, e);
  }
  return className === DEFAULT_CLASS ? [...DEFAULT_ROLLS] : [];
}

function saveRollsForClass(className, rolls) {
  try {
    localStorage.setItem(ROLLS_STORAGE_PREFIX + className, JSON.stringify(rolls));
  } catch (e) {
    console.error(`Error saving roll configuration for ${className}:`, e);
  }
}

function resetRollsForClass(className) {
  try {
    if (className === DEFAULT_CLASS) {
      saveRollsForClass(DEFAULT_CLASS, DEFAULT_ROLLS);
    } else {
      saveRollsForClass(className, []);
    }
  } catch (e) {
    console.error(`Error resetting roll configuration for ${className}:`, e);
  }
}

// Session-specific Attendance Storage Key
function getAttendanceRecordKey(className, date, session) {
  return `${RECORD_STORAGE_PREFIX}${className}_${date}_${session}`;
}

function loadAttendanceForCurrentSession() {
  const dateVal = document.getElementById("date")?.value || new Date().toISOString().split("T")[0];
  const sessionRadio = document.querySelector('input[name="session"]:checked');
  const session = sessionRadio ? sessionRadio.value : "FORENOON";

  const key = getAttendanceRecordKey(activeClass, dateVal, session);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const validSet = new Set(currentRolls);
        currentAbsentSet = new Set(parsed.filter(r => validSet.has(r)));
        return;
      }
    }
  } catch (e) {
    console.error("Error loading session attendance:", e);
  }
  currentAbsentSet = new Set();
}

function saveAttendanceForCurrentSession() {
  const dateVal = document.getElementById("date")?.value || new Date().toISOString().split("T")[0];
  const sessionRadio = document.querySelector('input[name="session"]:checked');
  const session = sessionRadio ? sessionRadio.value : "FORENOON";

  const key = getAttendanceRecordKey(activeClass, dateVal, session);
  try {
    localStorage.setItem(key, JSON.stringify([...currentAbsentSet]));
  } catch (e) {
    console.error("Error saving session attendance:", e);
  }
}

function migrateRollInAttendanceRecords(className, oldRoll, newRoll) {
  try {
    const prefix = `${RECORD_STORAGE_PREFIX}${className}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const recordData = localStorage.getItem(key);
        if (recordData) {
          const parsed = JSON.parse(recordData);
          if (Array.isArray(parsed) && parsed.includes(oldRoll)) {
            const updated = parsed.map((r) => (r === oldRoll ? newRoll : r));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error migrating roll in attendance records for ${className}:`, e);
  }
}


// =========================================================
// Class Dropdowns & Switcher
// =========================================================

function populateClassDropdowns() {
  const mainSelect = document.getElementById("classSelector");
  const modalSelect = document.getElementById("modalClassSelect");

  if (mainSelect) {
    mainSelect.innerHTML = "";
    classesList.forEach((cls) => {
      const opt = document.createElement("option");
      opt.value = cls;
      opt.textContent = cls;
      if (cls === activeClass) opt.selected = true;
      mainSelect.appendChild(opt);
    });
  }

  if (modalSelect) {
    modalSelect.innerHTML = "";
    classesList.forEach((cls) => {
      const opt = document.createElement("option");
      opt.value = cls;
      opt.textContent = cls;
      if (cls === modalActiveClass) opt.selected = true;
      modalSelect.appendChild(opt);
    });
  }
}

function handleClassChange(newClass) {
  if (!classesList.includes(newClass)) return;
  activeClass = newClass;
  localStorage.setItem(ACTIVE_CLASS_KEY, activeClass);
  modalActiveClass = activeClass;
  populateClassDropdowns();
  generateRolls();
}

function handleModalClassChange(newClass) {
  if (!classesList.includes(newClass)) return;
  modalActiveClass = newClass;
  const searchInput = document.getElementById("rollSearchInput");
  if (searchInput) searchInput.value = "";
  renderRollList();
}

// =========================================================
// Attendance Grid & Summary
// =========================================================

function generateRolls() {
  const container = document.getElementById("rollContainer");
  container.innerHTML = "";

  currentRolls = getRollsForClass(activeClass);
  loadAttendanceForCurrentSession();

  if (currentRolls.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; color: #64748b; font-size: 14px; font-weight: 600;">
        No roll numbers added for <strong>${activeClass}</strong>.<br>
        Click <button class="btn-primary" style="margin-top: 8px; font-size: 12px; height: 32px;" onclick="openSettingsModal()">⚙️ Manage Roll Numbers</button> to add students.
      </div>
    `;
    updateSummary();
    return;
  }

  currentRolls.forEach((roll) => {
    const isAbsent = currentAbsentSet.has(roll);
    const btn = document.createElement("button");
    btn.textContent = roll;
    btn.className = "roll-btn" + (isAbsent ? " absent" : "");

    btn.onclick = () => {
      if (currentAbsentSet.has(roll)) {
        currentAbsentSet.delete(roll);
        btn.classList.remove("absent");
      } else {
        currentAbsentSet.add(roll);
        btn.classList.add("absent");
      }
      saveAttendanceForCurrentSession();
      updateSummary();
    };

    container.appendChild(btn);
  });

  updateSummary();
}

function updateSummary() {
  // Total configured students for the active class
  const total = currentRolls.length;
  // Count of students marked absent
  const absentCount = currentAbsentSet.size;
  // Students present = Total - Absent
  const present = Math.max(0, total - absentCount);

  document.getElementById("total").textContent = total;
  document.getElementById("present").textContent = present;
  document.getElementById("absentCount").textContent = absentCount;

  const dateVal = document.getElementById("date").value;
  const sessionRadio = document.querySelector('input[name="session"]:checked');
  const session = sessionRadio ? sessionRadio.value : "FORENOON";

  function formatDate(input) {
    if (!input) return "Date";
    const d = new Date(input);
    if (isNaN(d)) return input;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  const date = formatDate(dateVal);
  const absList = currentRolls.filter((r) => currentAbsentSet.has(r)).join(", ") || "None";
  const percentVal = total > 0 ? (present / total) * 100 : 0;
  const percentage = Number.isInteger(percentVal) ? percentVal : percentVal.toFixed(2);

  document.getElementById("output").value =
`${session} ATTENDANCE – ${activeClass}

Date: ${date}

Absentees: ${absList}

Present: ${present}
Absent: ${absentCount}
Total: ${total}

Attendance: ${percentage}%`;
}

function copyText() {
  const text = document.getElementById("output").value;
  navigator.clipboard.writeText(text).then(() => {
    alert("Attendance copied!");
  }).catch((err) => {
    console.error(err);
    alert("Copy failed. Select the text and copy manually.");
  });
}

// =========================================================
// Settings Modal (Tabs & Management)
// =========================================================

function openSettingsModal() {
  modalActiveClass = activeClass;
  populateClassDropdowns();
  switchSettingsTab(currentSettingsTab);
  document.getElementById("settingsModal").style.display = "flex";
}

function closeSettingsModal() {
  document.getElementById("settingsModal").style.display = "none";
  populateClassDropdowns();
  generateRolls();
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  const tabBtnRolls = document.getElementById("tabBtnRolls");
  const tabBtnClasses = document.getElementById("tabBtnClasses");
  const tabContentRolls = document.getElementById("tabContentRolls");
  const tabContentClasses = document.getElementById("tabContentClasses");

  if (tab === "rolls") {
    tabBtnRolls.classList.add("active");
    tabBtnClasses.classList.remove("active");
    tabContentRolls.style.display = "block";
    tabContentClasses.style.display = "none";
    const searchInput = document.getElementById("rollSearchInput");
    if (searchInput) searchInput.value = "";
    renderRollList();
  } else {
    tabBtnClasses.classList.add("active");
    tabBtnRolls.classList.remove("active");
    tabContentClasses.style.display = "block";
    tabContentRolls.style.display = "none";
    renderClassList();
  }
}

// --- Roll Number Tab Logic ---

function handleRollSearch(term) {
  renderRollList(term);
}

function renderRollList(filterTerm = "") {
  const tbody = document.getElementById("rollTableBody");
  tbody.innerHTML = "";
  const filter = filterTerm.trim().toUpperCase();
  const rolls = getRollsForClass(modalActiveClass);

  rolls.forEach((roll, index) => {
    if (filter && !roll.toUpperCase().includes(filter)) {
      return;
    }

    const tr = document.createElement("tr");

    // # Index
    const tdIndex = document.createElement("td");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // Roll Badge
    const tdRoll = document.createElement("td");
    tdRoll.innerHTML = `<span class="roll-badge">${roll}</span>`;
    tr.appendChild(tdRoll);

    // Reorder (Up / Down)
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
    downBtn.disabled = index === rolls.length - 1;
    downBtn.onclick = () => moveRoll(index, 1);

    tdReorder.appendChild(upBtn);
    tdReorder.appendChild(downBtn);
    tr.appendChild(tdReorder);

    // Actions (Edit / Delete)
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
    td.textContent = filter ? "No matching roll numbers found." : `No roll numbers configured for ${modalActiveClass}.`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

function openAddRollModal() {
  editingRollIndex = -1;
  document.getElementById("rollEditModalTitle").textContent = `Add Roll Number (${modalActiveClass})`;
  const rollInput = document.getElementById("rollInput");
  rollInput.value = "";
  clearRollInputError();
  document.getElementById("rollEditModal").style.display = "flex";
  rollInput.focus();
}

function openEditRollModal(index) {
  editingRollIndex = index;
  const rolls = getRollsForClass(modalActiveClass);
  document.getElementById("rollEditModalTitle").textContent = `Edit Roll Number (${modalActiveClass})`;
  const rollInput = document.getElementById("rollInput");
  rollInput.value = rolls[index] || "";
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

function saveRollNumber() {
  const rollInput = document.getElementById("rollInput");
  const val = rollInput.value.trim();

  if (!val) {
    showRollInputError("Roll number cannot be empty.");
    return;
  }

  const rolls = getRollsForClass(modalActiveClass);

  // Check uniqueness within the selected class
  const isDuplicate = rolls.some((r, idx) => {
    if (editingRollIndex >= 0 && idx === editingRollIndex) return false;
    return r.toUpperCase() === val.toUpperCase();
  });

  if (isDuplicate) {
    showRollInputError(`Roll number "${val}" already exists in ${modalActiveClass}.`);
    return;
  }

  if (editingRollIndex === -1) {
    rolls.push(val);
  } else {
    const oldRoll = rolls[editingRollIndex];
    rolls[editingRollIndex] = val;

    // Migrate attendance records belonging ONLY to modalActiveClass
    migrateRollInAttendanceRecords(modalActiveClass, oldRoll, val);

    // Update active absent record if currently editing the active class
    if (modalActiveClass === activeClass) {
      if (currentAbsentSet.has(oldRoll)) {
        currentAbsentSet.delete(oldRoll);
        currentAbsentSet.add(val);
        saveAttendanceForCurrentSession();
      }
    }
  }

  saveRollsForClass(modalActiveClass, rolls);
  closeRollEditModal();
  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);

  if (modalActiveClass === activeClass) {
    generateRolls();
  }
}

function deleteRoll(index) {
  const rolls = getRollsForClass(modalActiveClass);
  const rollToDelete = rolls[index];
  const confirmed = confirm(`Are you sure you want to delete roll number "${rollToDelete}" from ${modalActiveClass}?`);
  if (!confirmed) return;

  // Only update current session attendance state if modalActiveClass is the currently active class
  if (modalActiveClass === activeClass) {
    if (currentAbsentSet.has(rollToDelete)) {
      currentAbsentSet.delete(rollToDelete);
      saveAttendanceForCurrentSession();
    }
  }

  rolls.splice(index, 1);
  saveRollsForClass(modalActiveClass, rolls);

  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);

  if (modalActiveClass === activeClass) {
    generateRolls();
  }
}

function moveRoll(index, direction) {
  const rolls = getRollsForClass(modalActiveClass);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= rolls.length) return;

  const temp = rolls[index];
  rolls[index] = rolls[targetIndex];
  rolls[targetIndex] = temp;

  saveRollsForClass(modalActiveClass, rolls);

  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);

  if (modalActiveClass === activeClass) {
    generateRolls();
  }
}

function handleResetRolls() {
  const confirmed = confirm(`Are you sure you want to reset roll numbers for "${modalActiveClass}"?`);
  if (!confirmed) return;

  resetRollsForClass(modalActiveClass);

  // Only reset currentAbsentSet if modalActiveClass is the currently active class
  if (modalActiveClass === activeClass) {
    currentAbsentSet.clear();
    saveAttendanceForCurrentSession();
  }

  const searchVal = document.getElementById("rollSearchInput")?.value || "";
  renderRollList(searchVal);

  if (modalActiveClass === activeClass) {
    generateRolls();
  }
}

// --- Class Management Tab Logic ---

function renderClassList() {
  const tbody = document.getElementById("classTableBody");
  tbody.innerHTML = "";

  classesList.forEach((cls, index) => {
    const tr = document.createElement("tr");

    // # Index
    const tdIndex = document.createElement("td");
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // Class Name & Active Indicator
    const tdName = document.createElement("td");
    const isCurrent = cls === activeClass;
    tdName.innerHTML = `
      <strong style="color: #0f172a; font-size: 14px;">${cls}</strong>
      ${isCurrent ? '<span style="display:inline-block; margin-left:6px; font-size:11px; padding:2px 6px; background:#ecfdf5; color:#059669; border-radius:4px; font-weight:700;">Active</span>' : ''}
    `;
    tr.appendChild(tdName);

    // Total Students
    const tdCount = document.createElement("td");
    const count = getRollsForClass(cls).length;
    tdCount.innerHTML = `<span class="roll-badge" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1;">${count} Students</span>`;
    tr.appendChild(tdCount);

    // Actions (Edit / Delete)
    const tdActions = document.createElement("td");
    tdActions.className = "actions-cell";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-sm btn-edit";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openEditClassModal(cls);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-sm btn-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = classesList.length <= 1;
    deleteBtn.title = classesList.length <= 1 ? "At least one class must exist" : "Delete Class";
    deleteBtn.onclick = () => deleteClass(cls);

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function openAddClassModal() {
  editingClassName = "";
  document.getElementById("classEditModalTitle").textContent = "Add New Class";
  const classInput = document.getElementById("classInput");
  classInput.value = "";
  clearClassInputError();
  document.getElementById("classEditModal").style.display = "flex";
  classInput.focus();
}

function openEditClassModal(clsName) {
  editingClassName = clsName;
  document.getElementById("classEditModalTitle").textContent = `Edit Class Name (${clsName})`;
  const classInput = document.getElementById("classInput");
  classInput.value = clsName;
  clearClassInputError();
  document.getElementById("classEditModal").style.display = "flex";
  classInput.focus();
}

function closeClassEditModal() {
  document.getElementById("classEditModal").style.display = "none";
}

function clearClassInputError() {
  const errorEl = document.getElementById("classInputError");
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

function showClassInputError(msg) {
  const errorEl = document.getElementById("classInputError");
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

function saveClass() {
  const classInput = document.getElementById("classInput");
  const val = classInput.value.trim().toUpperCase();

  if (!val) {
    showClassInputError("Class name cannot be empty.");
    return;
  }

  // Check duplicate
  const isDuplicate = classesList.some((c) => {
    if (editingClassName && c.toUpperCase() === editingClassName.toUpperCase()) return false;
    return c.toUpperCase() === val;
  });

  if (isDuplicate) {
    showClassInputError(`Class "${val}" already exists.`);
    return;
  }

  if (!editingClassName) {
    // Adding new class
    classesList.push(val);
    saveClassesList(classesList);
    if (!localStorage.getItem(ROLLS_STORAGE_PREFIX + val)) {
      saveRollsForClass(val, []);
    }
  } else {
    // Renaming existing class
    const oldName = editingClassName;
    const idx = classesList.indexOf(oldName);
    if (idx !== -1) {
      classesList[idx] = val;
      saveClassesList(classesList);
    }

    // Migrate rolls storage
    const oldRolls = getRollsForClass(oldName);
    saveRollsForClass(val, oldRolls);

    // Update active class if renamed
    if (activeClass === oldName) {
      activeClass = val;
      localStorage.setItem(ACTIVE_CLASS_KEY, activeClass);
    }
    if (modalActiveClass === oldName) {
      modalActiveClass = val;
    }
  }

  closeClassEditModal();
  populateClassDropdowns();
  renderClassList();
  generateRolls();
}

function deleteClass(clsName) {
  if (classesList.length <= 1) {
    alert("You cannot delete the only remaining class.");
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete class "${clsName}"?\nHistorical attendance records will be safely retained.`);
  if (!confirmed) return;

  classesList = classesList.filter((c) => c !== clsName);
  saveClassesList(classesList);

  if (activeClass === clsName) {
    activeClass = classesList[0] || DEFAULT_CLASS;
    localStorage.setItem(ACTIVE_CLASS_KEY, activeClass);
  }
  if (modalActiveClass === clsName) {
    modalActiveClass = classesList[0] || DEFAULT_CLASS;
  }

  populateClassDropdowns();
  renderClassList();
  generateRolls();
}

// =========================================================
// PWA Offline & Connectivity Helpers
// =========================================================

let deferredInstallPrompt = null;

function updateOnlineStatus() {
  const statusEl = document.getElementById("connectionStatus");
  if (!statusEl) return;
  const textEl = statusEl.querySelector(".status-text");

  if (navigator.onLine) {
    statusEl.className = "status-badge online";
    if (textEl) textEl.textContent = "Online";
    statusEl.title = "Connected to network";
  } else {
    statusEl.className = "status-badge offline";
    if (textEl) textEl.textContent = "Offline Mode";
    statusEl.title = "Working fully offline";
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((reg) => {
          console.log("RTR Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    });
  }
}

function initPWAInstallation() {
  const installBtn = document.getElementById("pwaInstallBtn");
  if (!installBtn) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installBtn.style.display = "inline-flex";
  });

  installBtn.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log("User install choice:", outcome);
      deferredInstallPrompt = null;
      installBtn.style.display = "none";
    }
  });

  window.addEventListener("appinstalled", () => {
    console.log("RTR Attendance App was installed successfully.");
    installBtn.style.display = "none";
    deferredInstallPrompt = null;
  });
}

// =========================================================
// Initialization on Page Load
// =========================================================

window.onload = () => {
  // 1. Set today's date if not provided
  const dateInput = document.getElementById("date");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  // 2. Setup listeners for Date & Session radios -> regenerate attendance
  document.getElementById("date")?.addEventListener("change", () => {
    generateRolls();
  });

  document.querySelectorAll('input[name="session"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      generateRolls();
    });
  });

  // 3. Enter key support on Modals
  document.getElementById("rollInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveRollNumber();
  });
  document.getElementById("classInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveClass();
  });

  // 4. Online / Offline listeners
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // 5. PWA setup
  registerServiceWorker();
  initPWAInstallation();

  // 6. Initialize Multi-Class System
  initClassSystem();
  populateClassDropdowns();
  generateRolls();
};
