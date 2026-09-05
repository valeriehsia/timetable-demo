/**
 * 桃園市高原國小 課表查詢系統
 * 國小一～六年級版
 */

let scheduleData = [];
let homeroomData = {};
let isLoggedIn = false;
let navHistory = [];
let classGroups = {};

const DAYS = ['一','二','三','四','五'];
const PERIODS_ALL = [0,1,2,3,4,5,6,7,8];
const GRADE_NAMES = ['一年級','二年級','三年級','四年級','五年級','六年級'];
const GRADE_SELECT_IDS = ['sel1','sel2','sel3','sel4','sel5','sel6'];

const loginView = document.getElementById('loginView');
const queryView = document.getElementById('queryView');
const resultView = document.getElementById('resultView');
const loadingOverlay = document.getElementById('loadingOverlay');
const scheduleTitle = document.getElementById('scheduleTitle');
const scheduleTableContainer = document.getElementById('scheduleTableContainer');

function showView(viewId) {
    [loginView, queryView, resultView].forEach(v => {
        if (!v) return;
        v.classList.remove('active', 'result-active');
        v.style.display = 'none';
    });
    const target = document.getElementById(viewId);
    if (!target) return;
    if (viewId === 'resultView') {
        target.classList.add('result-active');
        target.style.display = 'block';
    } else {
        target.classList.add('active');
        target.style.display = 'flex';
    }
    window.scrollTo({top:0, behavior:'smooth'});
}

function showQueryView() {
    navHistory = [];
    resetGradeSelects();
    showView('queryView');
}

function logout() {
    isLoggedIn = false;
    scheduleData = [];
    homeroomData = {};
    navHistory = [];
    const pw = document.getElementById('loginPassword');
    const err = document.getElementById('loginError');
    if (pw) pw.value = '';
    if (err) err.textContent = '';
    showView('loginView');
}

function pushNav(type, value) {
    navHistory.push({type, value});
    updateBackBtn();
}

function goBack() {
    if (navHistory.length <= 1) {
        showQueryView();
        return;
    }
    navHistory.pop();
    const prev = navHistory[navHistory.length - 1];
    navHistory.pop();
    if (prev.type === 'class') displayClassSchedule(prev.value);
    else displayTeacherSchedule(prev.value);
}

function updateBackBtn() {
    const btn = document.getElementById('backBtn');
    if (btn) btn.style.visibility = navHistory.length > 1 ? 'visible' : 'hidden';
}

function populateSemesterSelect() {
    const sel = document.getElementById('semesterSelect');
    if (!sel || !CONFIG.SEMESTERS) return;
    sel.innerHTML = '';
    const keys = Object.keys(CONFIG.SEMESTERS);
    keys.forEach((label, i) => {
        const opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        if (i === keys.length - 1) opt.selected = true;
        sel.appendChild(opt);
    });
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    errEl.textContent = '';

    if (username === CONFIG.USERNAME && password === CONFIG.PASSWORD) {
        btn.disabled = true;
        spinner.classList.add('show');
        const semLabel = document.getElementById('semesterSelect')?.value || '';
        await fetchAndParseCSV(semLabel);
        btn.disabled = false;
        spinner.classList.remove('show');
    } else {
        errEl.textContent = '帳號或密碼錯誤，請再試一次';
        errEl.classList.add('show');
    }
});

async function guestLogin() {
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('guestBtn');
    errEl.textContent = '';
    errEl.classList.remove('show');
    if (btn) btn.disabled = true;
    const semLabel = document.getElementById('semesterSelect')?.value || '';
    await fetchAndParseCSV(semLabel);
    if (btn) btn.disabled = false;
}

async function fetchAndParseCSV(semLabel) {
    loadingOverlay.classList.add('show');
    const csvUrl = CONFIG.SEMESTERS?.[semLabel] || './timetable_115-1.csv';
    try {
        const response = await fetch(csvUrl + '?v=' + Date.now());
        if (!response.ok) throw new Error(`HTTP 錯誤 ${response.status}`);
        const csvText = await response.text();

        const jsonUrl = csvUrl.replace('timetable_', 'homerooms_').replace('.csv', '.json');
        try {
            const hmRes = await fetch(jsonUrl + '?v=' + Date.now());
            homeroomData = hmRes.ok ? await hmRes.json() : {};
        } catch {
            homeroomData = {};
        }

        const parsed = parseCSV(csvText);
        if (!parsed.length) throw new Error('CSV 資料為空');

        scheduleData = parsed;
        buildCategories();
        populateQueryUI();
        isLoggedIn = true;

        const badge = document.getElementById('currentSemester');
        if (badge) badge.textContent = semLabel || '';

        loadingOverlay.classList.remove('show');
        showView('queryView');
    } catch (err) {
        loadingOverlay.classList.remove('show');
        console.error(err);
        const e = document.getElementById('loginError');
        e.textContent = `載入失敗：${err.message}。請確認課表 CSV 已上傳。`;
        e.classList.add('show');
    }
}

function splitCSVLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQ && line[i + 1] === '"') {
                cur += '"'; i++;
            } else {
                inQ = !inQ;
            }
        } else if (c === ',' && !inQ) {
            result.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}

function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (!lines.length) return [];
    const headers = splitCSVLine(lines[0]).map((h, i) => i === 0 ? h.replace(/^\uFEFF/, '') : h);
    return lines.slice(1).map(line => {
        const vals = splitCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
        return obj;
    }).filter(r => r.teachername);
}

function buildCategories() {
    window.locationNames = new Set();
    const allClasses = new Set();
    scheduleData.forEach(row => {
        for (let d = 1; d <= 5; d++) {
            for (const p of PERIODS_ALL) {
                const classStr = row[`c${d}${p}`];
                if (classStr) classStr.split(/\s+/).filter(Boolean).forEach(c => allClasses.add(c));
                const loc = row[`l${d}${p}`];
                if (loc) window.locationNames.add(loc);
            }
        }
    });

    classGroups = {};
    GRADE_NAMES.forEach(g => classGroups[g] = []);
    [...allClasses].forEach(cls => {
        const m = String(cls).match(/^([1-6])\d{2}$/);
        if (m) classGroups[GRADE_NAMES[Number(m[1]) - 1]].push(cls);
    });
    GRADE_NAMES.forEach(g => classGroups[g].sort((a,b) => Number(a) - Number(b)));

}


function classDisplayName(cls) {
    const m = String(cls).match(/^([1-6])(\d{2})$/);
    if (!m) return cls;
    const gradeZh = ['','一','二','三','四','五','六'];
    const classZh = {1:'甲',2:'乙',3:'丙',4:'丁',5:'戊'};
    const grade = Number(m[1]);
    const classNo = Number(m[2]);
    return `${gradeZh[grade]}年${classZh[classNo] || classNo}班`;
}

function populateQueryUI() {
    GRADE_NAMES.forEach((grade, i) => populateGradeSelect(GRADE_SELECT_IDS[i], classGroups[grade] || []));

    const locationSel = document.getElementById('locationSelect');
    if (locationSel) {
        locationSel.innerHTML = '<option value="">— 選擇場地 —</option>';
        const normalRooms = new Set([
            '一年甲班','一年乙班','二年甲班','二年乙班','二年丙班',
            '三年甲班','三年乙班','四年甲班','四年乙班',
            '四年甲班教室','四年乙班教室',
            '五年甲班','五年乙班','五年乙班教室','五年丙班',
            '六年甲班','六年乙班','六年丙班'
        ]);
        [...(window.locationNames || [])]
            .filter(x => x && !normalRooms.has(x))
            .sort((a,b) => a.localeCompare(b,'zh-Hant'))
            .forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.textContent = loc;
                locationSel.appendChild(opt);
            });
    }

    const teacherSel = document.getElementById('teacherSelect');
    if (teacherSel) {
        teacherSel.innerHTML = '<option value="">— 選擇教師 —</option>';
        scheduleData
            .map(r => r.teachername)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
            .forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                teacherSel.appendChild(opt);
            });
    }
}

function populateGradeSelect(selId, classes) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '<option value="">— 選擇班級 —</option>';
    classes.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = classDisplayName(cls);
        sel.appendChild(opt);
    });
}

function setupGradeSelects() {
    GRADE_SELECT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            if (el.value) {
                GRADE_SELECT_IDS.filter(x => x !== id).forEach(otherId => {
                    const other = document.getElementById(otherId);
                    if (other) other.value = '';
                });
            }
            const err = document.getElementById('classError');
            if (err) {
                err.textContent = '';
                err.classList.remove('show');
            }
        });
    });
}

function resetGradeSelects() {
    GRADE_SELECT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['classError','teacherError'].forEach(id => {
        const e = document.getElementById(id);
        if (e) {
            e.textContent = '';
            e.classList.remove('show');
        }
    });
}

function switchTab(tab) {
    document.getElementById('tabClass').classList.toggle('active', tab === 'class');
    document.getElementById('tabTeacher').classList.toggle('active', tab === 'teacher');
    document.getElementById('tabLocation').classList.toggle('active', tab === 'location');
    document.getElementById('tabFree').classList.toggle('active', tab === 'free');
    document.getElementById('panelClass').classList.toggle('hidden', tab !== 'class');
    document.getElementById('panelTeacher').classList.toggle('hidden', tab !== 'teacher');
    document.getElementById('panelLocation').classList.toggle('hidden', tab !== 'location');
    document.getElementById('panelFree').classList.toggle('hidden', tab !== 'free');
}

function submitClassQuery() {
    const cls = GRADE_SELECT_IDS.map(id => document.getElementById(id)?.value).find(Boolean);
    if (!cls) {
        const e = document.getElementById('classError');
        e.textContent = '請先選擇一個班級';
        e.classList.add('show');
        return;
    }
    navHistory = [];
    displayClassSchedule(cls);
}

function submitTeacherQuery() {
    const teacher = document.getElementById('teacherSelect').value;
    if (!teacher) {
        const e = document.getElementById('teacherError');
        e.textContent = '請先選擇教師';
        e.classList.add('show');
        return;
    }
    navHistory = [];
    displayTeacherSchedule(teacher);
}

function submitFreeTeacherQuery() {
    const day = Number(document.getElementById('freeDaySelect').value);
    const period = Number(document.getElementById('freePeriodSelect').value);
    const e = document.getElementById('freeError');

    if (!day || !period) {
        e.textContent = '請先選擇星期與節次';
        e.classList.add('show');
        return;
    }
    e.textContent = '';
    e.classList.remove('show');

    const freeTeachers = scheduleData
        .filter(row => !(row[`s${day}${period}`] || '').trim())
        .map(row => row.teachername)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

    const dayNames = ['', '星期一', '星期二', '星期三', '星期四', '星期五'];
    const pt = (CONFIG.PERIOD_TIMES || [])[period] || {};
    const timeText = pt.start && pt.end ? `（${pt.start}–${pt.end}）` : '';

    scheduleTitle.textContent = `${dayNames[day]} 第${period}節${timeText} 空堂教師`;

    if (!freeTeachers.length) {
        scheduleTableContainer.innerHTML = '<div class="alert alert-warning show">這個時段沒有查到空堂教師。</div>';
    } else {
        scheduleTableContainer.innerHTML = `
            <div style="margin-bottom:1rem;font-weight:700;">共 ${freeTeachers.length} 位教師空堂</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
                ${freeTeachers.map(name => `
                    <button class="btn btn-ghost" style="padding:.8rem .5rem;" onclick="displayTeacherSchedule('${String(name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
                        ${htmlText(name)}
                    </button>
                `).join('')}
            </div>`;
    }

    navHistory = [];
    showView('resultView');
    updateBackBtn();
}

function submitLocationQuery() {
    const loc = document.getElementById('locationSelect').value;
    if (!loc) {
        const e = document.getElementById('locationError');
        e.textContent = '請先選擇場地';
        e.classList.add('show');
        return;
    }
    navHistory = [];
    displayLocationSchedule(loc);
}

function displayLocationSchedule(locationName) {
    navHistory = [];
    const cells = {};
    scheduleData.forEach(row => {
        for (let d=1; d<=5; d++) {
            for (const p of PERIODS_ALL) {
                if ((row[`l${d}${p}`] || '') === locationName && row[`s${d}${p}`]) {
                    const key = `${d}-${p}`;
                    if (!cells[key]) cells[key] = {subject: row[`s${d}${p}`], items: []};
                    const cls = row[`c${d}${p}`] || '';
                    const label = `${classDisplayName(cls)}｜${row.teachername}`;
                    if (!cells[key].items.includes(label)) cells[key].items.push(label);
                }
            }
        }
    });
    scheduleTitle.textContent = `${locationName} 使用課表`;
    scheduleTableContainer.innerHTML = buildLocationTable(cells);
    showView('resultView');
    updateBackBtn();
}

function buildLocationTable(cells) {
    const periods = CONFIG.PERIOD_TIMES || [];
    let html = '<table class="schedule-table"><thead><tr><th class="th-period">節次</th>';
    DAYS.forEach(d => html += `<th>${d}</th>`);
    html += '</tr></thead><tbody>';
    for (let p=1; p<=7; p++) {
        const pt=periods[p] || {start:'',end:''};
        html += `<tr><td class="td-period"><div class="period-num">第${p}節</div><div class="period-time">${pt.start}<br>${pt.end}</div></td>`;
        for (let d=1; d<=5; d++) {
            const cell=cells[`${d}-${p}`];
            if (!cell) html += '<td class="td-empty"></td>';
            else html += `<td class="td-cell"><div class="cell-subject">${htmlText(cell.subject)}</div><div class="cell-items-container">${cell.items.map(htmlText).join('<br>')}</div></td>`;
        }
        html += '</tr>';
    }
    return html + '</tbody></table>';
}

function displayClassSchedule(className) {
    pushNav('class', className);
    const cells = {};

    scheduleData.forEach(row => {
        for (let d = 1; d <= 5; d++) {
            for (const p of PERIODS_ALL) {
                const classes = (row[`c${d}${p}`] || '').split(/\s+/).filter(Boolean);
                if (classes.includes(className) && row[`s${d}${p}`]) {
                    const key = `${d}-${p}`;
                    if (!cells[key]) {
                        cells[key] = {subject: row[`s${d}${p}`], items: [row.teachername]};
                    } else if (!cells[key].items.includes(row.teachername)) {
                        cells[key].items.push(row.teachername);
                    }
                }
            }
        }
    });

    const hmTeacher = homeroomData[className] || '';
    const hmHtml = hmTeacher
        ? `<span style="font-size:1.1rem;color:var(--text-dim);margin-left:.5rem;font-weight:500;">(導師：${htmlText(hmTeacher)})</span>`
        : '';

    scheduleTitle.innerHTML = `${htmlText(classDisplayName(className))}課表 ${hmHtml}`;
    scheduleTableContainer.innerHTML = buildScheduleTable(cells, 'class');
    showView('resultView');
    updateBackBtn();
}

function displayTeacherSchedule(teacherName) {
    pushNav('teacher', teacherName);
    const row = scheduleData.find(r => r.teachername === teacherName);
    const cells = {};

    if (row) {
        for (let d = 1; d <= 5; d++) {
            for (const p of PERIODS_ALL) {
                if (row[`s${d}${p}`]) {
                    const key = `${d}-${p}`;
                    const classes = (row[`c${d}${p}`] || '').split(/\s+/).filter(Boolean);
                    cells[key] = {subject: row[`s${d}${p}`], items: classes};
                }
            }
        }
    }

    scheduleTitle.textContent = `${teacherName} 老師課表`;
    scheduleTableContainer.innerHTML = buildScheduleTable(cells, 'teacher');
    showView('resultView');
    updateBackBtn();
}

function buildScheduleTable(cells, mode) {
    const periods = CONFIG.PERIOD_TIMES || [];
    const hasEarly = Object.keys(cells).some(k => k.endsWith('-0'));
    const highestUsed = Math.max(
        1,
        ...Object.keys(cells)
            .map(k => Number(k.split('-')[1]))
            .filter(p => Number.isFinite(p) && p > 0)
    );
    // 高原國小目前正式課表到第7節；若未來資料有第8節會自動顯示
    const maxPeriod = Math.max(7, highestUsed);

    let html = '<table class="schedule-table"><thead><tr>';
    html += '<th class="th-period">節次</th>';
    DAYS.forEach(d => html += `<th>${d}</th>`);
    html += '</tr></thead><tbody>';

    if (hasEarly) {
        const et = periods[0] || {start:'07:40', end:'08:10'};
        html += `<tr><td class="td-period"><div class="period-num">早自習</div><div class="period-time">${et.start}<br>${et.end}</div></td>`;
        for (let d = 1; d <= 5; d++) html += renderCell(cells[`${d}-0`], mode);
        html += '</tr>';
    }

    for (let p = 1; p <= maxPeriod; p++) {
        const pt = periods[p] || {start:'', end:''};
        html += `<tr><td class="td-period"><div class="period-num">第${p}節</div>`;
        if (pt.start && pt.start !== '——') html += `<div class="period-time">${pt.start}<br>${pt.end}</div>`;
        html += '</td>';
        for (let d = 1; d <= 5; d++) html += renderCell(cells[`${d}-${p}`], mode);
        html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
}

function renderCell(cell, mode) {
    if (!cell) return '<td class="td-empty"></td>';

    const itemsHtml = (cell.items || []).map(item => {
        if (mode === 'class') {
            return `<div class="cell-link" data-teacher="${attrText(item)}">${htmlText(item)}</div>`;
        } else {
            return `<div class="cell-link" data-class="${attrText(item)}">${htmlText(classDisplayName(item))}</div>`;
        }
    }).join(' ');

    return `<td class="td-cell"><div class="cell-subject">${htmlText(cell.subject)}</div><div class="cell-items-container">${itemsHtml}</div></td>`;
}

function htmlText(str) {
    return String(str ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function attrText(str) {
    return htmlText(str);
}

document.addEventListener('click', e => {
    const teacher = e.target.closest('[data-teacher]');
    if (teacher) {
        displayTeacherSchedule(teacher.dataset.teacher);
        return;
    }
    const cls = e.target.closest('[data-class]');
    if (cls) displayClassSchedule(cls.dataset.class);
});

function printSchedule() {
    const title = scheduleTitle.textContent;
    const tableHTML = scheduleTableContainer.innerHTML;
    const semLabel = document.getElementById('currentSemester')?.textContent || '';
    const win = window.open('', '_blank', 'width=1100,height=750');
    win.document.write(`<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8"><title>${htmlText(title)}</title>
<style>
@page { size:A4 landscape; margin:1cm; }
body { font-family:"Noto Sans TC",sans-serif; font-size:10pt; }
h2 { text-align:center; margin-bottom:4px; font-size:14pt; }
p.sem { text-align:center; font-size:9pt; color:#555; margin:0 0 8px; }
table { width:100%; border-collapse:collapse; }
th,td { border:1px solid #999; padding:4px 6px; text-align:center; vertical-align:middle; }
th { background:#e8e8e8; font-weight:600; }
.td-period { background:#f5f5f5; width:4rem; }
.period-num { font-weight:600; font-size:9pt; }
.period-time { font-size:7.5pt; color:#555; }
.cell-subject { font-weight:500; }
.cell-link { font-size:8.5pt; color:#444; }
.td-empty { background:#fafafa; }
</style></head><body>
<h2>${htmlText(title)}</h2><p class="sem">${htmlText(semLabel)}</p>${tableHTML}
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
    win.document.close();
}

document.addEventListener('DOMContentLoaded', () => {
    populateSemesterSelect();
    setupGradeSelects();
    updateBackBtn();
    showView('loginView');
});
