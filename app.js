(function () {
  "use strict";

  const storageKey = "clean-schedule-state-v2";
  const signInUsernameStorageKey = "fakeup-skl-username-v1";
  const dayNames = ["一", "二", "三", "四", "五", "六", "日"];
  const termWeeks = 17;
  const oldPalette = ["#1aa6a6", "#258bd2", "#d48a35", "#7c58d9", "#e86852", "#2fa56f", "#c15ba5", "#5b8def", "#c47f2c", "#15a3c7", "#df5f8f", "#6d8f28"];
  const palette = ["#7dd8d5", "#9cccf5", "#f5b8ae", "#cbb7f4", "#9edfc1", "#f4cd86", "#efb6d3", "#a9d9f4", "#c8e4a5", "#b9d9ff", "#f7c1b0", "#a8e2df"];
  const defaultTimes = [
    ["08:05", "08:50"],
    ["08:55", "09:40"],
    ["10:00", "10:45"],
    ["10:50", "11:35"],
    ["11:40", "12:25"],
    ["13:30", "14:15"],
    ["14:20", "15:05"],
    ["15:15", "16:00"],
    ["16:05", "16:50"],
    ["18:30", "19:15"],
    ["19:20", "20:05"],
    ["20:10", "20:55"],
    ["21:00", "21:45"]
  ];

  const today = startOfDay(new Date());
  const fallbackStart = toISODate(startOfWeek(today));
  const signInLoginUrl = "https://skl.hdu.edu.cn/api/login/dingtalk/auth?index=&code=0&authCode=0&state=0";
  const signInUrl = "https://skl.hdu.edu.cn/#/sign/in";
  const signInApiBase = "/api/signin";
  const signInCaptchaScriptUrl = "https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js";
  const signInCaptchaSceneId = "2q42bw25";
  const signInCaptchaPrefix = "cr5a57";

  const elements = {
    scheduleList: document.querySelector("#scheduleList"),
    todayCourses: document.querySelector("#todayCourses"),
    todayBadge: document.querySelector("#todayBadge"),
    weekTitle: document.querySelector("#weekTitle"),
    weekPickerBtn: document.querySelector("#weekPickerBtn"),
    weekSelect: document.querySelector("#weekSelect"),
    dateRangeText: document.querySelector("#dateRangeText"),
    weekStrip: document.querySelector("#weekStrip"),
    timetable: document.querySelector("#timetable"),
    prevWeekBtn: document.querySelector("#prevWeekBtn"),
    nextWeekBtn: document.querySelector("#nextWeekBtn"),
    currentWeekBtn: document.querySelector("#currentWeekBtn"),
    toggleOtherWeekBtn: document.querySelector("#toggleOtherWeekBtn"),
    topbarMenuBtn: document.querySelector("#topbarMenuBtn"),
    topbarMenu: document.querySelector("#topbarMenu"),
    openSettingsBtn: document.querySelector("#openSettingsBtn"),
    openImportBtn: document.querySelector("#openImportBtn"),
    openSignInBtn: document.querySelector("#openSignInBtn"),
    exportImageBtn: document.querySelector("#exportImageBtn"),
    newScheduleBtn: document.querySelector("#newScheduleBtn"),
    settingsDialog: document.querySelector("#settingsDialog"),
    settingName: document.querySelector("#settingName"),
    settingStartDate: document.querySelector("#settingStartDate"),
    settingCellHeight: document.querySelector("#settingCellHeight"),
    saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
    deleteScheduleBtn: document.querySelector("#deleteScheduleBtn"),
    pdfFileInput: document.querySelector("#pdfFileInput"),
    sheetBackdrop: document.querySelector("#sheetBackdrop"),
    courseSheet: document.querySelector("#courseSheet"),
    courseDetail: document.querySelector("#courseDetail"),
    signinBackdrop: document.querySelector("#signinBackdrop"),
    signinPanel: document.querySelector("#signinPanel"),
    signinCurrentCourse: document.querySelector("#signinCurrentCourse"),
    signinStatus: document.querySelector("#signinStatus"),
    signInLoginFields: document.querySelector("#signInLoginFields"),
    signInCodeField: document.querySelector("#signInCodeField"),
    signInUsernameInput: document.querySelector("#signInUsernameInput"),
    signInPasswordInput: document.querySelector("#signInPasswordInput"),
    signInCodeInput: document.querySelector("#signInCodeInput"),
    signInCaptcha: document.querySelector("#signInCaptcha"),
    signInCaptchaTrigger: document.querySelector("#signInCaptchaTrigger"),
    closeSignInBtn: document.querySelector("#closeSignInBtn"),
    signInAccountLoginBtn: document.querySelector("#signInAccountLoginBtn"),
    signInSubmitBtn: document.querySelector("#signInSubmitBtn"),
    pdfDebugPanel: document.querySelector("#pdfDebugPanel"),
    pdfDebugText: document.querySelector("#pdfDebugText"),
    closePdfDebugBtn: document.querySelector("#closePdfDebugBtn"),
    toast: document.querySelector("#toast")
  };

  const pdfDebugEnabled = new URLSearchParams(window.location.search).get("debug") === "pdf"
    || ["localhost", "127.0.0.1"].includes(window.location.hostname);

  let state = loadState();
  let signInCaptchaReadyPromise = null;
  let signInCaptchaReady = false;
  let signInCaptchaSubmitTimer = null;
  let signInPositionCache = null;
  let signInPositionCacheAt = 0;
  function createDefaultState() {
    const scheduleId = uid();
    return {
      currentScheduleId: scheduleId,
      selectedWeek: 1,
      schedules: [
        {
          id: scheduleId,
          name: "我的课表",
          startDate: fallbackStart,
          totalWeeks: termWeeks,
          nodes: 13,
          cellHeight: 76,
          showWeekend: false,
          showOtherWeek: true,
          showTime: true,
          timeTable: cloneDefaultTimeTable(13),
          courses: []
        }
      ]
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && Array.isArray(saved.schedules) && saved.schedules.length) {
        return normalizeState(saved);
      }
    } catch (error) {
      console.warn("读取本地课表失败，使用默认数据。", error);
    }
    return createDefaultState();
  }

  function normalizeState(saved) {
    const normalized = {
      currentScheduleId: saved.currentScheduleId,
      selectedWeek: Number(saved.selectedWeek) || 1,
      schedules: saved.schedules.map((schedule) => ({
        id: schedule.id || uid(),
        name: schedule.name || "我的课表",
        startDate: schedule.startDate || fallbackStart,
        totalWeeks: termWeeks,
        nodes: 13,
        cellHeight: Math.min(clamp(Number(schedule.cellHeight) || 76, 72, 132), 76),
        showWeekend: false,
        showOtherWeek: schedule.showOtherWeek !== false,
        showTime: schedule.showTime !== false,
        timeTable: cloneDefaultTimeTable(13),
        courses: Array.isArray(schedule.courses) ? schedule.courses.map(normalizeCourse).filter(Boolean) : []
      }))
    };
    if (!normalized.schedules.some((schedule) => schedule.id === normalized.currentScheduleId)) {
      normalized.currentScheduleId = normalized.schedules[0].id;
    }
    const current = normalized.schedules.find((schedule) => schedule.id === normalized.currentScheduleId);
    normalized.selectedWeek = clamp(normalized.selectedWeek, 1, current.totalWeeks);
    return normalized;
  }

  function normalizeCourse(course) {
    if (!course || !course.name) return null;
    const repairedCourse = repairImportedCourse(course);
    const normalizedName = cleanupField(repairedCourse.name);
    if (!normalizedName || isLegendText(normalizedName) || isCourseNoiseLine(normalizedName) || /^(无|null|undefined)$/i.test(normalizedName)) return null;
    const baseSession = normalizeSession(repairedCourse);
    const sessions = Array.isArray(repairedCourse.sessions)
      ? repairedCourse.sessions.map((session) => normalizeSession({ ...repairedCourse, ...session })).filter(Boolean)
      : [];
    const normalizedSessions = sessions.length ? dedupeSessions(sessions) : [];
    const first = normalizedSessions[0] || baseSession;
    if (!first) return null;
    return {
      id: repairedCourse.id || uid(),
      name: normalizedName.slice(0, 30),
      color: freshCourseColor(repairedCourse.color || palette[0]),
      credit: repairedCourse.credit ? String(repairedCourse.credit).slice(0, 8) : "",
      day: first.day,
      start: first.start,
      end: first.end,
      weeks: first.weeks,
      room: first.room,
      teacher: repairedCourse.teacher ? String(repairedCourse.teacher).slice(0, 20) : first.teacher,
      note: repairedCourse.note ? String(repairedCourse.note).slice(0, 80) : "",
      sessions: normalizedSessions.length > 1 ? normalizedSessions : undefined
    };
  }

  function repairImportedCourse(course) {
    const name = cleanupField(course.name);
    const room = cleanupField(course.room || course.sessions?.[0]?.room || "");
    if (name === "吴周礼" && /(?:课外实践|不在教室|第12教研楼114)/.test(room)) {
      return { ...course, name: "大学军事", teacher: course.teacher || "吴周礼", credit: course.credit || "2" };
    }
    if (name === "大学军事") {
      return {
        ...course,
        teacher: cleanupField(course.teacher || "") ? course.teacher : /(?:课外实践|不在教室|第12教研楼114)/.test(room) ? "吴周礼" : course.teacher,
        credit: course.credit || "2"
      };
    }
    return course;
  }

  function normalizeSession(session) {
    if (!session) return null;
    const start = clamp(Number(session.start) || 1, 1, 13);
    const end = clamp(Number(session.end) || start, start, 13);
    const weeks = uniqueNumbers(session.weeks || [1]).filter((week) => week >= 1 && week <= termWeeks);
    if (!weeks.length) return null;
    return {
      day: clamp(Number(session.day) || 1, 1, 7),
      start,
      end,
      weeks,
      room: session.room ? String(session.room).slice(0, 30) : "",
      teacher: session.teacher ? String(session.teacher).slice(0, 20) : ""
    };
  }

  function dedupeSessions(sessions) {
    const seen = new Set();
    return sessions.filter((session) => {
      const key = [session.day, session.start, session.end, formatWeeks(session.weeks), session.room, session.teacher].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function currentSchedule() {
    return state.schedules.find((schedule) => schedule.id === state.currentScheduleId) || state.schedules[0];
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function render() {
    const schedule = currentSchedule();
    state.selectedWeek = clamp(state.selectedWeek, 1, schedule.totalWeeks);
    document.documentElement.style.setProperty("--day-count", visibleDays(schedule).length);
    document.documentElement.style.setProperty("--cell-height", `${schedule.cellHeight}px`);
    if (elements.toggleOtherWeekBtn) elements.toggleOtherWeekBtn.textContent = schedule.showOtherWeek ? "隐藏非本周课程" : "显示非本周课程";
    renderScheduleList(schedule);
    renderWeekHeader(schedule);
    renderTimetable(schedule);
    renderToday(schedule);
  }

  function renderScheduleList(activeSchedule) {
    elements.scheduleList.innerHTML = "";
    state.schedules.forEach((schedule) => {
      const button = document.createElement("button");
      button.className = `schedule-tab${schedule.id === activeSchedule.id ? " active" : ""}`;
      button.type = "button";
      button.innerHTML = `<strong>${escapeHtml(schedule.name)}</strong><span>${schedule.courses.length} 门课程 · ${schedule.totalWeeks} 周</span>`;
      button.addEventListener("click", () => {
        state.currentScheduleId = schedule.id;
        state.selectedWeek = getCurrentWeek(schedule);
        saveState();
        render();
      });
      elements.scheduleList.append(button);
    });
  }

  function renderWeekHeader(schedule) {
    const weekStart = addDays(parseISODate(schedule.startDate), (state.selectedWeek - 1) * 7);
    const weekEnd = addDays(weekStart, 6);
    const status = weekStatus(schedule);
    elements.weekTitle.textContent = `第 ${state.selectedWeek} 周${status}`;
    if (elements.weekSelect) {
      if (elements.weekSelect.options.length !== schedule.totalWeeks) {
        elements.weekSelect.innerHTML = "";
        for (let week = 1; week <= schedule.totalWeeks; week += 1) {
          elements.weekSelect.append(new Option(`第 ${week} 周`, String(week)));
        }
      }
      elements.weekSelect.value = String(state.selectedWeek);
    }
    elements.dateRangeText.textContent = `2026-2027 · 第一学期`;

    elements.weekStrip.innerHTML = "";
    const month = document.createElement("div");
    month.className = "month-cell";
    month.textContent = `${weekStart.getMonth() + 1}月`;
    elements.weekStrip.append(month);

    visibleDays(schedule).forEach((day) => {
      const date = addDays(weekStart, day - 1);
      const cell = document.createElement("div");
      cell.className = `day-cell${isSameDate(date, today) ? " today" : ""}`;
      cell.innerHTML = `<div class="day-pill"><strong>${dayNames[day - 1]}</strong><span>${date.getDate()}</span></div>`;
      elements.weekStrip.append(cell);
    });
  }

  function renderTimetable(schedule) {
    const days = visibleDays(schedule);
    elements.timetable.innerHTML = "";

    for (let node = 1; node <= schedule.nodes; node += 1) {
      const timeCell = document.createElement("div");
      timeCell.className = "time-cell";
      const time = schedule.timeTable[node - 1] || defaultTimes[node - 1] || ["", ""];
      timeCell.innerHTML = schedule.showTime
        ? `<span class="time-start">${time[0]}</span><strong>${node}</strong><span class="time-end">${time[1]}</span>`
        : `<strong>${node}</strong>`;
      elements.timetable.append(timeCell);

      days.forEach((day) => {
        const cell = document.createElement("div");
        cell.className = `grid-cell${day >= 6 ? " weekend" : ""}`;
        cell.setAttribute("aria-label", `周${dayNames[day - 1]} 第 ${node} 节`);
        elements.timetable.append(cell);
      });
    }

    const visibleItems = collapseEquivalentSessions(schedule.courses
      .flatMap((course) => courseRenderItems(course, state.selectedWeek))
      .filter((item) => days.includes(item.day))
      .filter((item) => item.isActive || schedule.showOtherWeek));

    if (!visibleItems.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = "<div><strong>还没有课程</strong><br>请点击右上角 PDF 导入课表</div>";
      elements.timetable.append(empty);
      return;
    }

    const gap = 1;
    const placedItems = layoutCourseItems(visibleItems);
    placedItems.forEach((item) => {
      const dayIndex = days.indexOf(item.day);
      if (dayIndex < 0) return;
      const card = document.createElement("button");
      const conflict = item.laneCount > 1;
      card.className = `course-card${item.isActive ? "" : " other-week"}${conflict ? " conflict" : ""}${item.laneCount > 1 ? " compact" : ""}`;
      card.type = "button";
      card.style.setProperty("--course-color", item.course.color);
      card.style.setProperty("--course-bg", tintColor(item.course.color, item.isActive ? 0.76 : 0.88));
      card.style.setProperty("--course-text", item.isActive ? courseTextColor(item.course.color) : "#6f7785");
      const dayWidth = `(100% - var(--time-width)) / ${days.length}`;
      card.style.left = `calc(var(--time-width) + (${dayWidth}) * ${dayIndex} + (${dayWidth}) * ${item.laneIndex / item.laneCount} + ${gap}px)`;
      card.style.top = `${(item.start - 1) * schedule.cellHeight + gap}px`;
      card.style.width = `calc((${dayWidth}) * ${1 / item.laneCount} - ${gap * 2}px)`;
      card.style.height = `${(item.end - item.start + 1) * schedule.cellHeight - gap * 2}px`;
      card.innerHTML = courseCardHtml(schedule, item);
      card.addEventListener("click", (event) => {
        event.stopPropagation();
        showCourseDetail(item.course.id, item.sessionIndex);
      });
      elements.timetable.append(card);
    });
  }

  function courseRenderItems(course, week = state.selectedWeek) {
    const sessions = courseSessions(course).map((session) => ({
      ...session,
      weeks: uniqueNumbers(session.weeks || []).filter((week) => week >= 1 && week <= termWeeks)
    })).filter((session) => session.weeks.length);
    return sessions.map((session, index) => ({
      course,
      sessionIndex: index,
      day: session.day,
      start: session.start,
      end: session.end,
      weeks: session.weeks,
      room: session.room || course.room || "",
      teacher: session.teacher || course.teacher || "",
      isActive: session.weeks.includes(week),
      laneIndex: 0,
      laneCount: 1
    }));
  }

  function courseSessions(course) {
    return Array.isArray(course.sessions) && course.sessions.length
      ? course.sessions
      : [{ day: course.day, start: course.start, end: course.end, weeks: course.weeks, room: course.room, teacher: course.teacher }];
  }

  function collapseEquivalentSessions(items) {
    const groups = new Map();
    items.forEach((item) => {
      const key = [item.course.id, item.day, item.start, item.end].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return Array.from(groups.values()).map((group) => {
      if (group.length === 1) return group[0];
      const activeItems = group.filter((item) => item.isActive);
      return preferConcreteSession(activeItems.length ? activeItems : group);
    });
  }

  function preferConcreteSession(items) {
    return [...items].sort((a, b) => sessionPriority(b) - sessionPriority(a))[0];
  }

  function sessionPriority(item) {
    const room = item.room || "";
    let score = item.isActive ? 100 : 0;
    if (room && !isPracticePlaceholder(room)) score += 20;
    if (room) score += 5;
    score += Math.min(item.weeks?.length || 0, termWeeks) / 100;
    return score;
  }

  function isPracticePlaceholder(value) {
    return /(?:课外实践|不在教室|待筛选)/.test(String(value || ""));
  }

  function layoutCourseItems(items) {
    const byDay = new Map();
    items.forEach((item) => {
      if (!byDay.has(item.day)) byDay.set(item.day, []);
      byDay.get(item.day).push(item);
    });
    const result = [];
    byDay.forEach((dayItems) => {
      const sorted = [...dayItems].sort((a, b) => a.start - b.start || a.end - b.end || a.course.name.localeCompare(b.course.name, "zh-Hans-CN"));
      const lanes = [];
      sorted.forEach((item) => {
        let laneIndex = lanes.findIndex((laneEnd) => laneEnd < item.start);
        if (laneIndex < 0) {
          laneIndex = lanes.length;
          lanes.push(0);
        }
        lanes[laneIndex] = item.end;
        item.laneIndex = laneIndex;
      });
      sorted.forEach((item) => {
        const overlaps = sorted.filter((other) => rangesOverlap(item, other));
        item.laneCount = Math.max(1, ...overlaps.map((other) => other.laneIndex + 1));
        result.push(item);
      });
    });
    return result;
  }

  function rangesOverlap(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  function courseCardHtml(schedule, item) {
    const lines = [item.course.name];
    if (!item.isActive) lines.push("非本周");
    if (item.teacher) lines.push(item.teacher);
    if (item.room) lines.push(item.room);
    return lines.map((line, index) => {
      const tag = index === 0 ? "strong" : "span";
      return `<${tag}>${escapeHtml(line)}</${tag}>`;
    }).join("");
  }
  function renderToday(schedule) {
    const currentWeek = getCurrentWeek(schedule);
    const todayDay = getChinaWeekday(today);
    const todaysCourses = collapseEquivalentSessions(schedule.courses
      .flatMap((course) => courseRenderItems(course, currentWeek))
      .filter((item) => item.day === todayDay && item.weeks.includes(currentWeek)))
      .sort((a, b) => a.start - b.start);
    elements.todayBadge.textContent = `第 ${currentWeek} 周`;
    elements.todayCourses.innerHTML = "";
    if (!todaysCourses.length) {
      elements.todayCourses.innerHTML = '<div class="today-item" style="--course-color:#cad3df"><strong>今天无课程</strong><span>可以安心安排自习或休息</span></div>';
      return;
    }
    todaysCourses.forEach((item) => {
      const button = document.createElement("button");
      button.className = "today-item";
      button.type = "button";
      button.style.setProperty("--course-color", item.course.color);
      button.innerHTML = `<strong>${escapeHtml(item.course.name)}</strong><span>${escapeHtml(sessionTimeText(schedule, item))}${item.room ? ` · ${escapeHtml(item.room)}` : ""}</span>`;
      button.addEventListener("click", () => showCourseDetail(item.course.id, item.sessionIndex));
      elements.todayCourses.append(button);
    });
  }

  function openWeekPicker() {
    const schedule = currentSchedule();
    closeWeekPicker();
    const currentWeek = getCurrentWeek(schedule);
    const backdrop = document.createElement("div");
    backdrop.className = "week-picker-backdrop";
    backdrop.innerHTML = `
      <section class="week-picker-sheet" role="dialog" aria-modal="true" aria-label="选择周数">
        <div class="week-picker-head">
          <div>
            <strong>选择周数</strong>
          </div>
          <button class="week-picker-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="week-picker-grid"></div>
      </section>`;
    const grid = backdrop.querySelector(".week-picker-grid");
    for (let week = 1; week <= schedule.totalWeeks; week += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `week-option${week === state.selectedWeek ? " active" : ""}${week === currentWeek ? " current" : ""}`;
      button.innerHTML = `<strong>第 ${week} 周</strong>${week === currentWeek ? "<span>本周</span>" : ""}`;
      button.addEventListener("click", () => {
        state.selectedWeek = week;
        saveState();
        closeWeekPicker();
        render();
      });
      grid.append(button);
    }
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeWeekPicker();
    });
    backdrop.querySelector(".week-picker-close").addEventListener("click", closeWeekPicker);
    document.body.append(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("open"));
  }

  function closeWeekPicker() {
    document.querySelector(".week-picker-backdrop")?.remove();
  }

  function openTopbarMenu() {
    if (!elements.topbarMenu || !elements.topbarMenuBtn) return;
    elements.topbarMenu.hidden = false;
    elements.topbarMenuBtn.setAttribute("aria-expanded", "true");
  }

  function closeTopbarMenu() {
    if (!elements.topbarMenu || !elements.topbarMenuBtn) return;
    elements.topbarMenu.hidden = true;
    elements.topbarMenuBtn.setAttribute("aria-expanded", "false");
  }

  function toggleTopbarMenu() {
    if (!elements.topbarMenu || !elements.topbarMenuBtn) return;
    if (elements.topbarMenu.hidden) openTopbarMenu();
    else closeTopbarMenu();
  }


  function openSignInPanel() {
    closeTopbarMenu();
    renderSignInCurrentCourse();
    loadSavedSignInUsername();
    elements.signinBackdrop.hidden = false;
    elements.signinPanel.hidden = false;
    checkSignInBackend().then(() => checkSignInAccountStatus({ quiet: true }));
  }

  function closeSignInPanel() {
    if (!elements.signinBackdrop || !elements.signinPanel) return;
    elements.signinBackdrop.hidden = true;
    elements.signinPanel.hidden = true;
  }

  function renderSignInCurrentCourse() {
    if (!elements.signinCurrentCourse) return;
    const item = getCurrentLiveCourse(currentSchedule());
    if (!item) {
      elements.signinCurrentCourse.innerHTML = "<strong>当前没有匹配到正在上的课</strong><span>仍可打开上课啦签到页。</span>";
      return;
    }
    const room = item.room ? ` · ${escapeHtml(item.room)}` : "";
    const teacher = item.teacher ? ` · ${escapeHtml(item.teacher)}` : "";
    elements.signinCurrentCourse.innerHTML = `<strong>${escapeHtml(item.course.name)}</strong><span>${escapeHtml(sessionTimeText(currentSchedule(), item))}${room}${teacher}</span>`;
  }

  function getCurrentLiveCourse(schedule) {
    const week = getCurrentWeek(schedule);
    const day = getChinaWeekday(today);
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const todays = collapseEquivalentSessions(schedule.courses
      .flatMap((course) => courseRenderItems(course, week))
      .filter((item) => item.day === day && item.isActive))
      .sort((a, b) => a.start - b.start);
    return todays.find((item) => {
      const start = timeToMinutes((schedule.timeTable[item.start - 1] || defaultTimes[item.start - 1] || [])[0]);
      const end = timeToMinutes((schedule.timeTable[item.end - 1] || defaultTimes[item.end - 1] || [])[1]);
      return start !== null && end !== null && minutes >= start - 10 && minutes <= end + 10;
    }) || todays.find((item) => item.start >= currentNodeByTime(schedule, minutes)) || null;
  }

  function currentNodeByTime(schedule, minutes) {
    const index = schedule.timeTable.findIndex((range) => {
      const end = timeToMinutes(range[1]);
      return end !== null && minutes <= end;
    });
    return index >= 0 ? index + 1 : schedule.nodes + 1;
  }

  function timeToMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function openSignInLogin() {
    window.open(signInLoginUrl, "_blank", "noopener");
    showToast("已打开登录页");
  }

  function openExternalSignIn() {
    window.open(signInUrl, "_blank", "noopener");
    showToast("已打开签到页");
  }

  function setSignInStatus(message, tone = "idle") {
    if (!elements.signinStatus) return;
    elements.signinStatus.textContent = message;
    elements.signinStatus.dataset.tone = tone;
  }

  function setSignInLoggedIn(loggedIn) {
    if (elements.signinPanel) elements.signinPanel.dataset.loggedIn = loggedIn ? "true" : "false";
    if (elements.signInLoginFields) elements.signInLoginFields.hidden = Boolean(loggedIn);
    if (elements.signInAccountLoginBtn) elements.signInAccountLoginBtn.hidden = Boolean(loggedIn);
    if (elements.signInCodeField) elements.signInCodeField.hidden = !loggedIn;
    if (elements.signInSubmitBtn) elements.signInSubmitBtn.hidden = !loggedIn;
    if (loggedIn) requestAnimationFrame(() => elements.signInCodeInput?.focus());
  }

  async function checkSignInBackend() {
    if (!elements.signinPanel || elements.signinPanel.hidden) return false;
    setSignInStatus("正在检查签到后端…");
    try {
      const response = await fetch(`${signInApiBase}/health`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSignInStatus(data?.message || "签到后端已连接。", "ok");
      return true;
    } catch (error) {
      setSignInStatus("签到后端还没有部署，当前只能打开上课啦官方签到页。", "warn");
      return false;
    }
  }

  function loadSavedSignInUsername() {
    if (!elements.signInUsernameInput) return;
    try {
      const username = localStorage.getItem(signInUsernameStorageKey) || "";
      if (username && !elements.signInUsernameInput.value) elements.signInUsernameInput.value = username;
    } catch (error) {
      console.warn("读取上课啦学号失败。", error);
    }
  }

  function saveSignInUsername(username) {
    try {
      localStorage.setItem(signInUsernameStorageKey, username);
    } catch (error) {
      console.warn("保存上课啦学号失败。", error);
    }
  }

  function renderAccountStatus(data) {
    if (!data?.loggedIn) {
      setSignInLoggedIn(false);
      setSignInStatus("第一次使用需要先登录。", "warn");
      return;
    }
    const userName = data?.user?.userName || data?.user?.id || "当前账号";
    setSignInLoggedIn(true);
    setSignInStatus(`${userName} 已登录。`, "ok");
  }

  async function checkSignInAccountStatus(options = {}) {
    try {
      const response = await fetch(`${signInApiBase}/account/status`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
      renderAccountStatus(data);
      return data;
    } catch (error) {
      setSignInLoggedIn(false);
      setSignInStatus(error?.message || "读取上课啦账号状态失败", "bad");
      if (!options.quiet) showToast("读取登录态失败");
      return null;
    }
  }

  async function loginSignInAccount() {
    const username = elements.signInUsernameInput?.value.trim() || "";
    const password = elements.signInPasswordInput?.value || "";
    if (!username || !password) {
      showToast("请输入学号和密码");
      (username ? elements.signInPasswordInput : elements.signInUsernameInput)?.focus();
      return;
    }
    saveSignInUsername(username);
    setSignInStatus("正在登录上课啦…");
    try {
      const response = await fetch(`${signInApiBase}/account/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
      if (elements.signInPasswordInput) elements.signInPasswordInput.value = "";
      renderAccountStatus({ ...data, loggedIn: true });
      showToast("上课啦已登录");
    } catch (error) {
      setSignInStatus(error?.message || "上课啦登录失败", "bad");
      showToast("上课啦登录失败");
    }
  }

  function loadSignInCaptchaScript() {
    if (window.initAliyunCaptcha) return Promise.resolve();
    const existing = document.querySelector(`script[src="${signInCaptchaScriptUrl}"]`);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("验证码 SDK 加载失败")), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = signInCaptchaScriptUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("验证码 SDK 加载失败，请检查网络后重试"));
      document.head.appendChild(script);
    });
  }

  function ensureSignInCaptcha() {
    if (signInCaptchaReady && window.initAliyunCaptcha) return Promise.resolve();
    if (signInCaptchaReadyPromise) return signInCaptchaReadyPromise;
    signInCaptchaReadyPromise = loadSignInCaptchaScript().then(() => new Promise((resolve, reject) => {
      if (!window.initAliyunCaptcha) throw new Error("验证码 SDK 初始化失败");
      const timeout = window.setTimeout(() => reject(new Error("验证码初始化超时，请重试")), 8000);
      try {
        window.initAliyunCaptcha({
          SceneId: signInCaptchaSceneId,
          prefix: signInCaptchaPrefix,
          mode: "popup",
          element: "#signInCaptcha",
          button: "#signInCaptchaTrigger",
          captchaVerifyCallback: handleSignInCaptchaVerify,
          onBizResultCallback: (passed) => {
            if (passed && elements.signInCodeInput) elements.signInCodeInput.value = "";
          },
          getInstance: () => {
            signInCaptchaReady = true;
            window.clearTimeout(timeout);
            resolve();
          },
          slideStyle: { width: Math.min(360, Math.max(260, window.innerWidth - 80)), height: 50 },
          language: "cn"
        });
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    })).catch((error) => {
      signInCaptchaReady = false;
      signInCaptchaReadyPromise = null;
      throw error;
    });
    return signInCaptchaReadyPromise;
  }

  function finishSignInSubmit() {
    if (signInCaptchaSubmitTimer) {
      window.clearTimeout(signInCaptchaSubmitTimer);
      signInCaptchaSubmitTimer = null;
    }
    if (elements.signInSubmitBtn) elements.signInSubmitBtn.disabled = false;
  }

  function getSignInPosition() {
    if (signInPositionCache && Date.now() - signInPositionCacheAt < 5 * 60 * 1000) return Promise.resolve(signInPositionCache);
    if (!navigator.geolocation) return Promise.reject(new Error("当前浏览器不支持定位，无法直接签到"));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = {
          latitude: Number(position.coords.latitude).toFixed(6),
          longitude: Number(position.coords.longitude).toFixed(6)
        };
        signInPositionCache = coords;
        signInPositionCacheAt = Date.now();
        resolve(coords);
      }, (error) => {
        const message = error?.code === 1 ? "需要允许定位后才能签到" : "定位失败，请确认系统定位已开启";
        reject(new Error(message));
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 });
    });
  }

  function signInResultMessage(data) {
    if (data?.message) return data.message;
    const result = data?.result || {};
    if (result.captchaVerifyCode === "F001") return "验证码风控未通过，请再点一次提交";
    if (result.captchaVerifyCode && result.captchaVerifyCode !== "T001") return `验证码未通过（${result.captchaVerifyCode}），请重试`;
    if (data?.upstreamStatus === 401) return "密令错误、签到未开始或当前课程不匹配";
    return "签到失败，请重试";
  }

  async function handleSignInCaptchaVerify(captchaVerifyParam) {
    const code = elements.signInCodeInput?.value.trim() || "";
    if (!code) {
      finishSignInSubmit();
      setSignInStatus("请输入密令。", "warn");
      showToast("请输入密令");
      return { captchaResult: true, bizResult: false };
    }
    try {
      setSignInStatus("正在获取定位…");
      const position = await getSignInPosition();
      setSignInStatus("正在提交密令…");
      const response = await fetch(`${signInApiBase}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, captchaVerifyParam, latitude: position.latitude, longitude: position.longitude, userAgent: navigator.userAgent })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.ok) {
        finishSignInSubmit();
        setSignInStatus(data?.message || "签到成功。", "ok");
        showToast("签到成功");
        if (elements.signInCodeInput) elements.signInCodeInput.value = "";
        return { captchaResult: true, bizResult: true };
      }
      const message = signInResultMessage(data);
      finishSignInSubmit();
      setSignInStatus(message, data?.code === "captcha_rejected" ? "warn" : "bad");
      showToast(message);
      return { captchaResult: data?.code === "captcha_rejected" ? false : true, bizResult: false };
    } catch (error) {
      finishSignInSubmit();
      const message = error?.message || "提交失败";
      setSignInStatus(message, "bad");
      showToast(message);
      return { captchaResult: true, bizResult: false };
    }
  }

  async function submitSignInCode() {
    const code = elements.signInCodeInput?.value.trim() || "";
    if (!code) {
      showToast("请输入密令");
      elements.signInCodeInput?.focus();
      return;
    }
    if (elements.signInSubmitBtn?.disabled) return;
    if (elements.signInSubmitBtn) elements.signInSubmitBtn.disabled = true;
    setSignInStatus("正在获取定位…");
    try {
      await getSignInPosition();
      setSignInStatus("正在准备验证码…");
      await ensureSignInCaptcha();
      setSignInStatus("正在唤起验证码…");
      signInCaptchaSubmitTimer = window.setTimeout(() => {
        finishSignInSubmit();
        setSignInStatus("验证码没有返回，请再点一次提交。", "warn");
      }, 25000);
      elements.signInCaptchaTrigger?.click();
    } catch (error) {
      finishSignInSubmit();
      const message = error?.message || "验证码启动失败";
      setSignInStatus(message, "bad");
      showToast(message);
    }
  }

  function showCourseDetail(courseId, sessionIndex = 0) {
    const schedule = currentSchedule();
    const course = schedule.courses.find((item) => item.id === courseId);
    if (!course) return;
    const session = courseSessions(course)[sessionIndex] || courseSessions(course)[0] || course;
    elements.courseDetail.innerHTML = `
      <div class="detail-card">
        <div class="detail-title">
          <span class="detail-accent" style="--course-color:${course.color}"></span>
          <h3>${escapeHtml(course.name)}</h3>
        </div>
        <div class="detail-row"><span>周数</span><strong>${escapeHtml(formatWeeks(session.weeks || course.weeks))}</strong></div>
        <div class="detail-row"><span>时间</span><strong>周${escapeHtml(dayNames[(session.day || course.day) - 1])} · ${escapeHtml(sessionTimeText(schedule, session))}</strong></div>
        <div class="detail-row"><span>地点</span><strong>${escapeHtml(session.room || course.room || "未填写")}</strong></div>
        <div class="detail-row"><span>老师</span><strong>${escapeHtml(session.teacher || course.teacher || "未填写")}</strong></div>
        <div class="detail-row"><span>学分</span><strong>${escapeHtml(course.credit || "未填写")}</strong></div>
      </div>`;
    elements.sheetBackdrop.hidden = false;
    elements.courseSheet.hidden = false;
  }

  function hideCourseDetail() {
    elements.sheetBackdrop.hidden = true;
    elements.courseSheet.hidden = true;
  }

  function openSettingsDialog() {
    const schedule = currentSchedule();
    elements.settingName.value = schedule.name;
    elements.settingStartDate.value = schedule.startDate;
    elements.settingCellHeight.value = String(schedule.cellHeight);
    elements.settingsDialog.showModal();
  }

  function saveSettingsFromDialog() {
    const schedule = currentSchedule();
    schedule.name = elements.settingName.value.trim() || "我的课表";
    schedule.startDate = elements.settingStartDate.value || fallbackStart;
    schedule.totalWeeks = termWeeks;
    schedule.nodes = 13;
    schedule.cellHeight = clamp(Number(elements.settingCellHeight.value) || 76, 72, 96);
    schedule.showWeekend = false;
    schedule.showTime = true;
    schedule.timeTable = cloneDefaultTimeTable(13);
    schedule.courses = schedule.courses
      .map((course) => trimCourseToSchedule(course, schedule))
      .filter(Boolean);
    state.selectedWeek = clamp(state.selectedWeek, 1, schedule.totalWeeks);
    saveState();
    elements.settingsDialog.close();
    render();
    showToast("设置已保存");
  }

  function trimCourseToSchedule(course, schedule) {
    const trimmed = normalizeCourse(course);
    if (!trimmed) return null;
    const trimSession = (session) => ({
      ...session,
      start: clamp(session.start, 1, schedule.nodes),
      end: clamp(session.end, 1, schedule.nodes),
      weeks: session.weeks.filter((week) => week <= schedule.totalWeeks)
    });
    const sessions = courseRenderItems(trimmed)
      .map((item) => trimSession(item))
      .filter((session) => session.weeks.length);
    if (!sessions.length) return null;
    const first = sessions[0];
    return normalizeCourse({
      ...trimmed,
      day: first.day,
      start: first.start,
      end: first.end,
      weeks: first.weeks,
      room: first.room,
      sessions: sessions.length > 1 ? sessions : undefined
    });
  }
  function createNewSchedule() {
    const schedule = {
      ...createDefaultState().schedules[0],
      id: uid(),
      name: `新课表 ${state.schedules.length + 1}`,
      totalWeeks: termWeeks,
      courses: []
    };
    state.schedules.push(schedule);
    state.currentScheduleId = schedule.id;
    state.selectedWeek = 1;
    saveState();
    render();
    openSettingsDialog();
  }

  function deleteCurrentSchedule() {
    if (state.schedules.length === 1) {
      showToast("至少保留一个课表");
      return;
    }
    const schedule = currentSchedule();
    state.schedules = state.schedules.filter((item) => item.id !== schedule.id);
    state.currentScheduleId = state.schedules[0].id;
    state.selectedWeek = getCurrentWeek(state.schedules[0]);
    saveState();
    elements.settingsDialog.close();
    render();
    showToast("课表已删除");
  }


  function applyImportedCourses(parsed) {
    const schedule = currentSchedule();
    const merged = mergeImportedCourseSessions(parsed);
    schedule.courses = merged.map((course, index) => normalizeCourse({
      id: uid(),
      color: courseColor(index),
      ...course
    })).filter(Boolean);
    schedule.nodes = 13;
    schedule.totalWeeks = termWeeks;
    schedule.showWeekend = false;
    schedule.timeTable = cloneDefaultTimeTable(13);
    state.selectedWeek = 1;
    saveState();
    render();
    showToast(`已导入 ${schedule.courses.length} 门课程`);
  }

  async function importPdfFile(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      showToast("请选择教务系统导出的 PDF 文件");
      return;
    }
    try {
      showToast("正在解析 PDF…");
      const result = await parseHduPdfDocument(file);
      if (pdfDebugEnabled) showPdfDebugJson(result.debugRecords);
      if (!result.courses.length) {
        showPdfDebugJson(result.debugRecords);
        showToast("PDF 里没有识别到课程，请确认是个人课表导出的 PDF");
        return;
      }
      applyImportedCourses(result.courses);
    } catch (error) {
      console.error(error);
      showToast("PDF 解析失败，请重新导出 PDF 后再试");
    } finally {
      if (elements.pdfFileInput) elements.pdfFileInput.value = "";
    }
  }

  async function loadPdfJs() {
    if (window.pdfjsLib?.getDocument) return window.pdfjsLib;
    const module = await import("./assets/pdfjs/pdf.min.js");
    module.GlobalWorkerOptions.workerSrc = "./assets/pdfjs/pdf.worker.min.js";
    return module;
  }

  async function parseHduPdf(file) {
    return (await parseHduPdfDocument(file)).courses;
  }

  async function parseHduPdfDocument(file) {
    const pdfjsLib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({
      data,
      cMapUrl: "./assets/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "./assets/pdfjs/standard_fonts/",
      useWorkerFetch: false
    }).promise;
    const courses = [];
    const cellRecords = [];
    const layout = { transpose: null, dayColumns: null, listDay: 1, listStart: null, listEnd: null };
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const result = await parseHduPdfPage(page, layout, pageNumber, pdf.numPages);
      courses.push(...result.courses);
      cellRecords.push(...result.cellRecords);
    }
    return {
      courses: dedupeImportedCourses(courses),
      cellRecords,
      debugRecords: cellRecords.map((record) => ({
        ...record,
        parsed: record.parsed || null
      }))
    };
  }

  async function parseHduPdfPage(page, layout, pageNumber = 1, pageCount = 1) {
    const content = await page.getTextContent({
      disableCombineTextItems: true,
      disableNormalization: false
    });
    const rawItems = content.items
      .map((item) => ({
        text: cleanupImportLine(item.str || ""),
        x: item.transform?.[4] || 0,
        y: item.transform?.[5] || 0,
        width: item.width || 0,
        height: Math.abs(item.height || item.transform?.[3] || 0)
      }))
      .filter((item) => item.text);
    const rawText = pdfItemsToText(rawItems);
    const streamListCourses = parseHduPdfItemStreamList(rawItems, layout);
    if (streamListCourses.length >= 3 || (pageCount > 1 && streamListCourses.length > 0)) {
      return {
        courses: streamListCourses,
        cellRecords: streamListCourses.map((course) => ({
          source: "hdu-pdf-item-stream",
          page: pageNumber,
          text: course.rawText || "",
          parsed: course
        }))
      };
    }
    const coordinateListCourses = parseHduPdfCoordinateListItems(rawItems);
    if (coordinateListCourses.length >= 3) {
      return {
        courses: coordinateListCourses,
        cellRecords: coordinateListCourses.map((course) => ({
          source: "hdu-pdf-coordinate-list",
          page: pageNumber,
          text: course.rawText || "",
          parsed: course
        }))
      };
    }
    const detailListCourses = parseHduPdfDetailListText(rawText);
    const listCourses = parseHduPdfListText(rawText);
    const textListCourses = listCourses.length >= detailListCourses.length ? listCourses : detailListCourses;
    if (textListCourses.length >= 3) {
      return {
        courses: textListCourses,
        cellRecords: textListCourses.map((course) => ({
          source: "hdu-pdf-list",
          page: pageNumber,
          text: course.rawText || "",
          parsed: course
        }))
      };
    }
    return {
      courses: [],
      cellRecords: [{
        source: "hdu-pdf-list-raw",
        page: pageNumber,
        itemCount: rawItems.length,
        streamListCourseCount: streamListCourses.length,
        coordinateListCourseCount: coordinateListCourses.length,
        textListCourseCount: listCourses.length,
        detailListCourseCount: detailListCourses.length,
        rawItems: rawItems.slice(0, 220).map((item) => ({
          text: item.text,
          x: Math.round(item.x * 10) / 10,
          y: Math.round(item.y * 10) / 10,
          width: Math.round(item.width * 10) / 10,
          height: Math.round(item.height * 10) / 10
        })),
        text: rawText.slice(0, 6000),
        parsed: null
      }]
    };
  }

  function pdfItemsToText(items) {
    if (!items.length) return "";
    const sorted = [...items].sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
    const lines = [];
    sorted.forEach((item) => {
      const line = lines.find((entry) => Math.abs(entry.y - item.y) <= 3);
      if (line) {
        line.items.push(item);
        line.y = (line.y + item.y) / 2;
      } else {
        lines.push({ y: item.y, items: [item] });
      }
    });
    return lines
      .sort((a, b) => b.y - a.y)
      .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "))
      .join("\n");
  }





  function parseHduPdfItemStreamList(rawItems, layout = {}) {
    const items = rawItems
      .map((item) => ({ ...item, text: cleanupImportLine(item.text || "") }))
      .filter((item) => item.text && !isHeaderLike(item.text) && !/^打印时间/.test(item.text));
    const records = [];
    let currentDay = layout.listDay || 1;
    let active = null;
    const finish = () => {
      if (active) records.push(active);
      active = null;
    };
    const firstExplicitDay = items
      .map((item) => dayFromLeadingText(item.text) || (/星期|周/.test(item.text) ? dayFromText(item.text) : 0))
      .find((day) => day >= 1 && day <= 5);
    if (firstExplicitDay === 1) currentDay = 1;
    items.forEach((item, index) => {
      const day = dayFromLeadingText(item.text) || (/星期|周/.test(item.text) ? dayFromText(item.text) : 0);
      if (day >= 1 && day <= 5 && /^\s*(?:星期|周)[一二三四五]\s*$/.test(item.text)) {
        finish();
        currentDay = day;
        layout.listDay = currentDay;
        return;
      }
      const section = listSectionToken(item.text);
      if (section) {
        finish();
        layout.listStart = section.start;
        layout.listEnd = section.end;
        active = {
          day: currentDay,
          start: section.start,
          end: section.end,
          name: "",
          lines: []
        };
        return;
      }
      const courseName = isCourseNameCandidateLine(item.text, { allowShortName: true }) ? cleanupField(item.text) : "";
      const nextText = cleanupImportLine(items[index + 1]?.text || "");
      if (!active && courseName && /周数\s*[:：]/.test(nextText) && layout.listStart && layout.listEnd) {
        active = {
          day: currentDay,
          start: layout.listStart,
          end: layout.listEnd,
          name: courseName,
          lines: []
        };
        return;
      }
      if (!active) return;
      if (courseName && /周数\s*[:：]/.test(nextText)) {
        if (active.name && active.lines.length) {
          const previous = active;
          records.push(previous);
          active = {
            day: previous.day,
            start: previous.start,
            end: previous.end,
            name: courseName,
            lines: []
          };
        } else {
          active.name = courseName;
        }
        return;
      }
      if (!active.name && courseName) {
        active.name = courseName;
        return;
      }
      if (active.name) active.lines.push(item.text);
    });
    finish();
    const parsed = records.map((record) => parseHduPdfStreamRecord(record)).filter(Boolean);
    if (parsed.length) {
      const last = parsed[parsed.length - 1];
      layout.listDay = last.day;
      layout.listStart = last.start;
      layout.listEnd = last.end;
    }
    return parsed;
  }

  function parseHduPdfStreamRecord(record) {
    const detailText = cleanupImportLine(record.lines.join(" "));
    const weeks = weeksFromText(detailText);
    const name = cleanupField(record.name);
    if (!record.day || record.day > 5 || !record.start || !record.end || !weeks?.length || !name || !isCourseNameCandidateLine(name, { allowShortName: true })) return null;
    return {
      name,
      day: record.day,
      start: clamp(record.start, 1, 13),
      end: clamp(record.end, record.start, 13),
      weeks,
      teacher: detectTeacher(record.lines, detailText),
      room: detectRoom(record.lines, detailText),
      credit: detectCredit(detailText),
      note: "",
      rawText: `${name} ${record.start}-${record.end} ${detailText}`
    };
  }

  function parseHduPdfCoordinateListItems(rawItems) {
    const items = rawItems.map((item) => ({
      ...item,
      text: cleanupImportLine(item.text || "")
    })).filter((item) => item.text);
    const detailStarts = items
      .filter((item) => /周数\s*[:：]/.test(item.text))
      .sort(pdfTopDownSort);
    if (detailStarts.length < 3) return [];
    const detailLeft = Math.min(...detailStarts.map((item) => item.x)) - 12;
    const sectionItems = items
      .map((item) => ({ ...item, section: listSectionToken(item.text) }))
      .filter((item) => item.section && item.x < detailLeft - 20)
      .sort(pdfTopDownSort);
    const nameItems = items
      .filter((item) => item.x > 80 && item.x < detailLeft - 10 && isCourseNameCandidateLine(item.text, { allowShortName: true }))
      .sort(pdfTopDownSort);
    const dayMarkers = items
      .map((item) => ({ ...item, day: dayFromLeadingText(item.text) || (/星期|周/.test(item.text) ? dayFromText(item.text) : 0) }))
      .filter((item) => item.day >= 1 && item.day <= 5 && item.x < detailLeft - 40)
      .sort(pdfTopDownSort);

    const rowDay = new Map();
    let currentDay = 1;
    [...dayMarkers.map((item) => ({ type: "day", item })), ...detailStarts.map((item) => ({ type: "row", item }))]
      .sort((a, b) => pdfTopDownSort(a.item, b.item) || (a.type === "day" ? -1 : 1))
      .forEach((event) => {
        if (event.type === "day") currentDay = event.item.day;
        else rowDay.set(event.item, currentDay);
      });

    return detailStarts.map((detail, index) => {
      const next = detailStarts[index + 1];
      const previous = detailStarts[index - 1];
      const topBound = previous ? (previous.y + detail.y) / 2 : Number.POSITIVE_INFINITY;
      const bottomBound = next ? (detail.y + next.y) / 2 : Number.NEGATIVE_INFINITY;
      const detailLines = items
        .filter((item) => item.x >= detailLeft && item.y <= topBound && item.y > bottomBound)
        .sort(pdfTopDownSort)
        .map((item) => item.text);
      const detailText = cleanupImportLine(detailLines.join(" "));
      const nameItem = nearestPdfListItem(nameItems, detail.y, (item) => item.x < detailLeft - 10);
      const sectionItem = nearestPdfListItem(sectionItems, detail.y, () => true, 22);
      const name = cleanupField(nameItem?.text || "");
      const section = sectionItem?.section;
      const weeks = weeksFromText(detailText);
      if (!name || !isValidCourseNameLine(name) || !section || !weeks?.length) return null;
      return {
        name,
        day: rowDay.get(detail) || 1,
        start: clamp(section.start, 1, 13),
        end: clamp(section.end, section.start, 13),
        weeks,
        teacher: detectTeacher([detailText], detailText),
        room: detectRoom([detailText], detailText),
        credit: detectCredit(detailText),
        note: "",
        rawText: `${name} ${section.start}-${section.end} ${detailText}`
      };
    }).filter(Boolean);
  }

  function pdfTopDownSort(a, b) {
    return Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x;
  }

  function nearestPdfListItem(items, y, predicate, tolerance = 14) {
    let best = null;
    items.forEach((item) => {
      if (!predicate(item)) return;
      const distance = Math.abs(item.y - y);
      if (distance > tolerance) return;
      if (!best || distance < best.distance) best = { item, distance };
    });
    return best?.item || null;
  }

  function parseHduPdfDetailListText(raw) {
    const source = cleanCourseText(raw);
    const detailMatches = [...source.matchAll(/周数\s*[:：][\s\S]*?学分\s*[:：]\s*\d+(?:\.\d+)?/g)];
    if (detailMatches.length < 3) return [];
    const details = detailMatches.map((match) => cleanupImportLine(match[0]));
    const tail = cleanupImportLine(source.slice(detailMatches[detailMatches.length - 1].index + detailMatches[detailMatches.length - 1][0].length));
    const tokens = tail
      .replace(/20\d{2}-20\d{2}学年第\d学期/g, " ")
      .replace(/星期[一二三四五六日]/g, " ")
      .split(/\s+/)
      .map((token) => cleanupImportLine(token))
      .filter(Boolean);
    const firstSectionIndex = tokens.findIndex((token) => listSectionToken(token));
    if (firstSectionIndex <= 0) return [];
    const names = tokens.slice(0, firstSectionIndex).filter((token) => isCourseNameCandidateLine(token, { allowShortName: true }));
    const sections = tokens.slice(firstSectionIndex).map(listSectionToken).filter(Boolean);
    const count = Math.min(details.length, names.length, sections.length);
    if (count < 3) return [];
    const courses = [];
    let day = 1;
    let previousStart = 0;
    for (let index = 0; index < count; index += 1) {
      const section = sections[index];
      if (index > 0 && section.start < previousStart) day += 1;
      previousStart = section.start;
      if (day > 5) break;
      const name = cleanupField(names[index]);
      const text = `${name} ${details[index]}`;
      const weeks = weeksFromText(details[index]);
      if (!weeks?.length || !name || !isValidCourseNameLine(name)) continue;
      courses.push({
        name,
        day,
        start: clamp(section.start, 1, 13),
        end: clamp(section.end, section.start, 13),
        weeks,
        teacher: detectTeacher([details[index]], details[index]),
        room: detectRoom([details[index]], details[index]),
        credit: detectCredit(details[index]),
        note: "",
        rawText: text
      });
    }
    return courses;
  }

  function listSectionToken(token) {
    const match = cleanupImportLine(token).match(/^(1[0-3]|[1-9])\s*(?:-|－|–|—|~|～|到|至)\s*(1[0-3]|[1-9])$/);
    return match ? { start: Number(match[1]), end: Number(match[2]) } : null;
  }

  function parseHduPdfListText(raw) {
    const lines = cleanCourseText(raw)
      .split(/\n+/)
      .map((line) => cleanupImportLine(line))
      .filter((line) => line && !isHeaderLike(line) && !isLegendText(line) && !/^打印时间/.test(line));
    const rawRecords = [];
    let currentDay = 0;
    let active = null;
    const finish = () => {
      if (active) rawRecords.push(active);
      active = null;
    };
    const backfillDay = (day) => {
      for (let index = rawRecords.length - 1; index >= 0 && !rawRecords[index].day; index -= 1) {
        rawRecords[index].day = day;
      }
      if (active && !active.day) active.day = day;
    };
    lines.forEach((line) => {
      const leadingDay = dayFromLeadingText(line);
      if (leadingDay) {
        currentDay = leadingDay;
        backfillDay(leadingDay);
        line = cleanupImportLine(line.replace(/^(?:星期|周)[一二三四五六日]\s*/, ""));
        if (!line) return;
      }
      if (!currentDay) {
        const inlineDay = dayFromText(line);
        if (inlineDay) {
          currentDay = inlineDay;
          backfillDay(inlineDay);
        }
      }
      const starter = parseHduPdfListStarter(line);
      if (starter) {
        finish();
        active = {
          day: currentDay,
          start: starter.start,
          end: starter.end,
          name: starter.name,
          lines: [starter.rest ? `${starter.name} ${starter.rest}` : starter.name]
        };
        return;
      }
      const bareSection = line.match(/^(1[0-3]|[1-9])\s*(?:-|－|–|—|~|～|到|至)\s*(1[0-3]|[1-9])$/);
      if (bareSection) {
        finish();
        active = {
          day: currentDay,
          start: Number(bareSection[1]),
          end: Number(bareSection[2]),
          name: "",
          lines: []
        };
        return;
      }
      if (!active) return;
      if (!active.name && isCourseNameCandidateLine(line, { allowShortName: true })) {
        active.name = cleanupField(line);
      }
      active.lines.push(line);
    });
    finish();
    return rawRecords.map((record) => parseHduPdfListRecord(record, record.day || currentDay)).filter(Boolean);
  }

  function parseHduPdfListStarter(line) {
    const match = cleanupImportLine(line).match(/^(?:(?:星期|周)[一二三四五六日]\s*)?(1[0-3]|[1-9])\s*(?:-|－|–|—|~|～|到|至)\s*(1[0-3]|[1-9])\s+(.+)$/);
    if (!match) return null;
    const sectionTail = cleanupImportLine(match[3]);
    const detailIndex = firstDetailIndex(sectionTail);
    const head = detailIndex >= 0 ? sectionTail.slice(0, detailIndex) : sectionTail;
    const rest = detailIndex >= 0 ? sectionTail.slice(detailIndex) : "";
    const name = cleanupField(head);
    if (!name || !isCourseNameCandidateLine(name, { allowShortName: true })) return null;
    return {
      start: Number(match[1]),
      end: Number(match[2]),
      name,
      rest
    };
  }

  function firstDetailIndex(value) {
    const source = cleanupImportLine(value);
    const patterns = [
      /(?:时间|上课时间|周次|校区|地点|场地|教师|老师|教学班|教学班组成|考核方式|选课备注|课程学时组成|课程学时|学分)\s*[:：]/,
      /(?:^|\s)\d{1,2}\s*(?:-|－|–|—|~|～|到|至)\s*\d{1,2}\s*周/,
      /(?:^|\s)\d{1,2}\s*周/,
      /\/(?:校区|地点|场地|教师|老师|教学班|考核方式|选课备注|课程学时|学分)\s*[:：]/
    ];
    const hits = patterns.map((pattern) => {
      const match = source.match(pattern);
      return match ? match.index + (match[0].startsWith("/") ? 1 : 0) : -1;
    }).filter((index) => index >= 0);
    return hits.length ? Math.min(...hits) : -1;
  }

  function parseHduPdfListRecord(record, fallbackDay) {
    const text = cleanCourseText(record.lines.join("\n"));
    const day = record.day || fallbackDay || dayFromText(text);
    const weeks = weeksFromText(text);
    const name = cleanupField(record.name || detectCourseName(record.lines, text));
    if (!day || day > 5 || !record.start || !record.end || !weeks?.length || !name || !isValidCourseNameLine(name)) return null;
    return {
      name,
      day,
      start: clamp(record.start, 1, 13),
      end: clamp(record.end, record.start, 13),
      weeks,
      teacher: detectTeacher(record.lines, text),
      room: detectRoom(record.lines, text),
      credit: detectCredit(text),
      note: "",
      rawText: text
    };
  }

  function dayFromLeadingText(text) {
    const source = cleanupImportLine(text);
    const match = source.match(/^(?:星期|周)([一二三四五六日])/);
    if (!match) return 0;
    return "一二三四五六日".indexOf(match[1]) + 1;
  }

  function mergeImportedCourseSessions(courses) {
    const groups = new Map();
    courses.forEach((course) => {
      if (!course || !course.name) return;
      const key = cleanupField(course.name);
      if (!groups.has(key)) {
        groups.set(key, {
          name: course.name,
          teacher: course.teacher || "",
          credit: course.credit || "",
          note: course.note || "",
          sessions: []
        });
      }
      const group = groups.get(key);
      if (!group.teacher && course.teacher) group.teacher = course.teacher;
      if (!group.credit && course.credit) group.credit = course.credit;
      group.sessions.push({
        day: course.day,
        start: course.start,
        end: course.end,
        weeks: course.weeks,
        room: course.room || "",
        teacher: course.teacher || group.teacher || ""
      });
    });
    return Array.from(groups.values()).map((course) => {
      const sessions = dedupeSessions(course.sessions.map(normalizeSession).filter(Boolean));
      const first = sessions[0];
      return {
        ...course,
        day: first?.day || 1,
        start: first?.start || 1,
        end: first?.end || 1,
        weeks: first?.weeks || [1],
        room: first?.room || "",
        sessions: sessions.length > 1 ? sessions : undefined
      };
    });
  }

  function courseColor(index) {
    return palette[index % palette.length];
  }


  function freshCourseColor(color) {
    const source = String(color || "").toLowerCase();
    const oldIndex = oldPalette.findIndex((item) => item.toLowerCase() === source);
    if (oldIndex >= 0) return palette[oldIndex % palette.length];
    const rgb = hexToRgb(source);
    if (!rgb) return palette[0];
    const luminance = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
    if (luminance < 0.58) {
      const mix = (channel) => Math.round(channel + (255 - channel) * 0.38);
      return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    }
    return source;
  }
  function isHduScheduleUrl(raw) {
    return /^https?:\/\/\S+$/i.test(raw) && /(newjw\.hdu\.edu\.cn|jwglxt|kbcx|xskbcx)/i.test(raw);
  }
  function parseHduSchedule(raw) {
    const structuredCourses = parseHduStructuredJson(raw);
    if (structuredCourses.length) return dedupeImportedCourses(structuredCourses);
    const htmlCourses = raw.includes("<") && raw.includes(">") ? parseHduHtml(raw) : [];
    if (htmlCourses.length) return dedupeImportedCourses(htmlCourses);
    const textCourses = parseHduText(raw);
    return dedupeImportedCourses(textCourses);
  }

  function parseHduStructuredJson(raw) {
    const source = String(raw || "").trim();
    if (!source.startsWith("{")) return [];
    try {
      const payload = JSON.parse(source);
      if (!payload || payload.source !== "fakeup-hdu-collector" || !Array.isArray(payload.courses)) return [];
      return payload.courses.map((course) => ({
        name: cleanupField(course.name),
        day: Number(course.day),
        start: Number(course.start),
        end: Number(course.end),
        weeks: uniqueNumbers(course.weeks || []).filter((week) => week >= 1 && week <= termWeeks),
        teacher: cleanupField(course.teacher || ""),
        room: cleanupField(course.room || ""),
        credit: course.credit ? formatCredit(course.credit) || String(course.credit).slice(0, 8) : "",
        note: ""
      })).filter((course) => course.name && course.day && course.start && course.end && course.weeks.length);
    } catch (error) {
      return [];
    }
  }

  function parseHduHtml(raw) {
    const courses = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");
    const modelCourses = parseHduModelList(doc);
    const modelMetadata = parseHduModelMetadata(doc);
    doc.querySelectorAll("#clean-schedule-copy-panel, textarea, script, style, noscript, input[type='hidden'], input[type=hidden]").forEach((node) => node.remove());
    doc.querySelectorAll("table").forEach((table) => {
      const grid = tableToGrid(table);
      const dayColumns = detectDayColumns(grid);
      if (!dayColumns.length) return;
      grid.forEach((row, rowIndex) => {
        const node = detectNodeNumber(row, rowIndex);
        if (!node) return;
        dayColumns.forEach(({ day, column }) => {
          const cell = row[column];
          if (!cell || cell.used || !cell.text || isHeaderLike(cell.text) || isLegendText(cell.text)) return;
          cell.used = true;
          parseHduCellCourses(cell.text, day, node, node + Math.max(1, cell.rowspan || 1) - 1).forEach((course) => courses.push(course));
        });
      });
    });
    const tableCourses = dedupeImportedCourses(courses);
    const enrichedTableCourses = mergeCourseMetadata(tableCourses, [...modelMetadata, ...modelCourses]);
    if (enrichedTableCourses.length >= Math.max(3, modelCourses.length)) return enrichedTableCourses;
    if (modelCourses.length >= 3) return modelCourses;
    return enrichedTableCourses.length ? enrichedTableCourses : modelCourses;
  }


  function mergeCourseMetadata(courses, metadataCourses) {
    if (!metadataCourses.length) return courses;
    const exact = new Map();
    const byName = new Map();
    metadataCourses.forEach((course) => {
      const name = cleanupField(course.name);
      const teacher = cleanupField(course.teacher || "");
      if (!name) return;
      exact.set([name, teacher].join("|"), course);
      if (!byName.has(name)) byName.set(name, course);
    });
    return courses.map((course) => {
      const name = cleanupField(course.name);
      const teacher = cleanupField(course.teacher || "");
      const meta = exact.get([name, teacher].join("|")) || byName.get(name);
      if (!meta) return course;
      return {
        ...course,
        credit: course.credit || meta.credit || "",
        teacher: course.teacher || meta.teacher || ""
      };
    });
  }

  function parseHduModelList(doc) {
    return parseHduModelRecords(doc).map(modelRecordToCourse).filter(Boolean);
  }

  function parseHduModelMetadata(doc) {
    return parseHduModelRecords(doc).map(modelRecordToMetadata).filter(Boolean);
  }

  function parseHduModelRecords(doc) {
    const records = new Map();
    doc.querySelectorAll("input[name^='modelList[']").forEach((input) => {
      const match = input.name.match(/^modelList\[(\d+)\]\.([^\]]+)$/);
      if (!match) return;
      const index = Number(match[1]);
      const key = match[2];
      const value = input.value || "";
      if (!records.has(index)) records.set(index, {});
      records.get(index)[key] = value;
    });
    return Array.from(records.values());
  }


  function modelRecordToMetadata(record) {
    const name = cleanupField(firstPresent(record, ["kcmc", "kcm", "kcmcText", "courseName", "course", "name"]));
    if (!name || isCourseNoiseLine(name)) return null;
    const credit = creditFromRecord(record);
    if (!credit) return null;
    return {
      name,
      teacher: cleanupField(firstPresent(record, ["xm", "jsxm", "rkjs", "teacherName", "teacher"])),
      credit
    };
  }

  function creditFromRecord(record) {
    const direct = detectCredit(firstPresent(record, ["xf", "credit", "credits", "xfmc", "xfs", "kcxz", "detail"]));
    if (direct) return direct;
    for (const [key, value] of Object.entries(record)) {
      if (/(?:^|[_.-])(?:xf|credit|credits)(?:$|[_.-])|学分/i.test(key)) {
        const found = detectCredit(value);
        if (found) return found;
      }
    }
    return "";
  }

  function modelRecordToCourse(record) {
    const name = cleanupField(firstPresent(record, ["kcmc", "kcm", "kcmcText", "courseName"]));
    if (!name || isCourseNoiseLine(name)) return null;
    const day = Number(firstPresent(record, ["xqj", "xq", "weekDay", "day"])) || dayFromText(firstPresent(record, ["xqjmc", "sksj", "sksjText", "time"]));
    if (!day || day > 5) return null;
    const section = sectionFromModel(record);
    if (!section) return null;
    const weeks = weeksFromModel(record);
    return {
      name,
      day,
      start: clamp(section.start, 1, 13),
      end: clamp(section.end, 1, 13),
      weeks: weeks.length ? weeks : range(1, currentSchedule().totalWeeks),
      teacher: cleanupField(firstPresent(record, ["xm", "jsxm", "rkjs", "teacherName", "teacher"])),
      room: cleanupField(firstPresent(record, ["cdmc", "jxcdmc", "jxcd", "roomName", "room"])),
      credit: creditFromRecord(record),
      note: ""
    };
  }

  function sectionFromModel(record) {
    const source = firstPresent(record, ["jc", "jcs", "skjc", "jcor", "oldjc", "sksj", "time"]);
    const parsed = sectionFromText(source);
    if (parsed) return parsed;
    const numbers = String(source || "").match(/1[0-3]|[1-9]/g)?.map(Number) || [];
    if (numbers.length) return { start: numbers[0], end: numbers[numbers.length - 1] };
    const start = Number(firstPresent(record, ["ksjc", "start", "startNode"]));
    const end = Number(firstPresent(record, ["jsjc", "end", "endNode"]));
    if (start && end) return { start, end };
    return null;
  }

  function weeksFromModel(record) {
    const source = firstPresent(record, ["zcd", "zcmc", "oldzc", "skzc", "zc", "weeks", "sksj"]);
    return weeksFromText(source) || [];
  }

  function firstPresent(record, keys) {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim() && String(value).trim() !== "undefined") return String(value).trim();
    }
    return "";
  }
  function tableToGrid(table) {
    const grid = [];
    const occupied = [];
    Array.from(table.rows).forEach((tr, rowIndex) => {
      const row = grid[rowIndex] || [];
      let column = 0;
      Array.from(tr.cells).forEach((td) => {
        while (occupied[rowIndex]?.[column]) column += 1;
        const rowspan = Math.max(1, Number(td.getAttribute("rowspan")) || 1);
        const colspan = Math.max(1, Number(td.getAttribute("colspan")) || 1);
        const text = elementText(td);
        const cell = { text, rowspan, colspan, used: false };
        for (let r = 0; r < rowspan; r += 1) {
          for (let c = 0; c < colspan; c += 1) {
            const targetRow = rowIndex + r;
            const targetColumn = column + c;
            grid[targetRow] ||= [];
            occupied[targetRow] ||= [];
            grid[targetRow][targetColumn] = cell;
            occupied[targetRow][targetColumn] = true;
          }
        }
        column += colspan;
      });
    });
    return grid;
  }


  function elementText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
    clone.querySelectorAll("div, p, li").forEach((node) => node.append("\n"));
    return cleanCourseText(clone.textContent || "");
  }
  function detectDayColumns(grid) {
    const bestRow = grid
      .map((row, index) => ({ row, index, score: row.filter((cell) => cell && dayFromText(cell.text)).length }))
      .sort((a, b) => b.score - a.score)[0];
    if (!bestRow || bestRow.score < 3) return [];
    return bestRow.row
      .map((cell, column) => ({ day: cell ? dayFromText(cell.text) : 0, column }))
      .filter((item) => item.day >= 1 && item.day <= 5);
  }

  function detectNodeNumber(row, rowIndex) {
    for (const cell of row.slice(0, 3)) {
      if (!cell || !cell.text) continue;
      const match = cell.text.match(/(?:第\s*)?(1[0-3]|[1-9])\s*(?:节|大节|\n|$)/);
      if (match) return Number(match[1]);
    }
    const fallback = rowIndex;
    return fallback >= 1 && fallback <= 13 ? fallback : 0;
  }

  function parseHduText(raw) {
    const text = cleanCourseText(stripHtml(raw));
    const courses = [];
    splitCourseBlocks(text).forEach((block) => {
      const day = dayFromText(block);
      const section = sectionFromText(block);
      if (!day || !section) return;
      const course = parseCourseBlock(block, day, section.start, section.end);
      if (course) courses.push(course);
    });
    return courses;
  }

  function parseHduCellCourses(text, fallbackDay, fallbackStart, fallbackEnd) {
    if (isLegendText(text)) return [];
    const lines = cleanCourseText(text)
      .split(/\n+/)
      .map((line) => cleanupImportLine(line))
      .filter((line) => line && !isCourseNoiseLine(line) && !isHeaderLike(line));
    const sectionIndexes = lines
      .map((line, index) => ({ line, index, section: sectionFromText(line) }))
      .filter((item) => item.section);
    if (!sectionIndexes.length) {
      if (!hasCourseLikeSignal(lines.join("\n"))) return [];
      return splitCourseBlocks(text).map((block) => parseCourseBlock(block, fallbackDay, fallbackStart, fallbackEnd)).filter(Boolean);
    }
    return sectionIndexes.map(({ line, index, section }, order) => {
      const inlineName = inlineCourseName(line);
      const nextBoundary = sectionIndexes[order + 1]?.index ?? lines.length;
      const name = inlineName || findCourseNameAround(lines, index, nextBoundary);
      if (!name || !isValidCourseNameLine(name)) return null;
      const contextLines = lines.slice(index + 1, Math.min(nextBoundary, index + 8));
      const nearbyText = lines.slice(Math.max(0, index - 2), Math.min(nextBoundary, index + 8)).join("\n");
      const room = cleanupField(contextLines.find(isRoomLikeLine) || "");
      const teacher = cleanupField(contextLines.find((item) => isTeacherLikeLine(item) && item !== room) || "");
      return {
        name,
        day: fallbackDay,
        start: section.start,
        end: section.end,
        weeks: weeksFromText(nearbyText) || range(1, currentSchedule().totalWeeks),
        room,
        teacher,
        credit: detectCredit(nearbyText) || detectCredit(text),
        note: ""
      };
    }).filter(Boolean);
  }

  function cleanupImportLine(line) {
    return String(line || "")
      .replace(/[♜♟♞♝♛♚◆●■▶▷]/g, "")
      .replace(/^[-—·•]+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }


  function inlineCourseName(line) {
    const source = cleanupImportLine(line);
    const match = source.match(/^(.+?)[（(]\s*(?:第\s*)?(?:1[0-3]|[1-9])\s*(?:-|－|–|—|~|～|到|至)\s*(?:1[0-3]|[1-9])\s*节/);
    if (!match) return "";
    const name = cleanupField(match[1]);
    return isCourseNameCandidateLine(name, { allowShortName: true }) ? name : "";
  }

  function findCourseNameAround(lines, sectionIndex, nextSectionIndex) {
    for (let index = sectionIndex - 1; index >= 0 && index >= sectionIndex - 8; index -= 1) {
      const candidate = cleanupField(lines[index]);
      if (isCourseNameCandidateLine(candidate, { allowShortName: true })) return candidate;
    }
    for (let index = sectionIndex + 1; index < nextSectionIndex && index <= sectionIndex + 5; index += 1) {
      const candidate = cleanupField(lines[index]);
      if (isCourseNameCandidateLine(candidate, { allowShortName: true })) return candidate;
    }
    return "";
  }

  function isValidCourseNameLine(value) {
    return isCourseNameCandidateLine(value);
  }

  function isCourseNameCandidateLine(value, options = {}) {
    const source = cleanupImportLine(value);
    const compact = cleanupField(source);
    if (!compact || compact.length < 2 || compact.length > 45) return false;
    if (!/[\u4e00-\u9fff]/.test(compact)) return false;
    if (isLegendText(source) || isHeaderLike(source) || isCourseNoiseLine(source) || isRoomLikeLine(source)) return false;
    if (isTeacherLikeLine(source) && !options.allowShortName && !isShortCourseName(source)) return false;
    if (sectionFromText(source) || /(?:\d{1,2}\s*(?:-|－|–|—|~|～|到|至)\s*\d{1,2}\s*周|单周|双周)/.test(source)) return false;
    if (/^\(?20\d{2}-20\d{2}-\d\)?/.test(source)) return false;
    if (/^[A-Z]?\d{4,}(?:[-—]\d+)?$/i.test(source)) return false;
    return true;
  }

  function isShortCourseName(value) {
    return /(?:大学军事|军事理论|体育|形势|政策|实践|课程|英语|物理|高数|数学|概率|统计|安全|导论|简史|交际)/.test(cleanupField(value));
  }

  function hasCourseLikeSignal(value) {
    const source = cleanCourseText(value);
    return /(?:\d{1,2}\s*(?:-|－|–|—|~|～|到|至)\s*\d{1,2}\s*周|单周|双周|\d{1,2}\s*节|教研楼|教学楼|教室|实验室|机房|田径场|体育馆|不在教室)/.test(source)
      && !isLegendText(source);
  }

  function isLegendText(value) {
    const source = cleanCourseText(value);
    return /(?:注[:：]|注意|提示|说明|红色斜体|蓝色为已选|待筛选|已选上|请选择记录)/.test(source);
  }

  function isTeacherLikeLine(value) {
    const source = cleanCourseText(value);
    return /^[\u4e00-\u9fa5]{2,4}$/.test(source) && !/[楼室场馆校区周节]/.test(source);
  }
  function parseCourseBlock(block, fallbackDay, fallbackStart, fallbackEnd) {
    const text = cleanCourseText(block);
    if (!text || isHeaderLike(text) || isLegendText(text)) return null;
    const day = dayFromText(text) || fallbackDay;
    if (!day || day > 5) return null;
    const section = sectionFromText(text);
    const weeksFromBlock = weeksFromText(text);
    if (!section && !weeksFromBlock && !hasCourseLikeSignal(text)) return null;
    const start = section ? section.start : fallbackStart;
    const end = section ? section.end : fallbackEnd;
    if (!start || !end || start > 13) return null;
    const weeks = weeksFromBlock || range(1, currentSchedule().totalWeeks);
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const name = detectCourseName(lines, text);
    if (!name || !isValidCourseNameLine(name)) return null;
    return {
      name,
      day,
      start: clamp(start, 1, 13),
      end: clamp(end, 1, 13),
      weeks,
      teacher: detectTeacher(lines, text),
      room: detectRoom(lines, text),
      credit: detectCredit(text),
      note: ""
    };
  }

  function splitCourseBlocks(text) {
    return cleanCourseText(text)
      .split(/\n{2,}|(?=星期[一二三四五]|周[一二三四五])/)
      .map((block) => block.trim())
      .filter((block) => block.length >= 3);
  }

  function dayFromText(text) {
    const source = cleanCourseText(text);
    const patterns = [
      [/星期一|周一|\b一\b/, 1],
      [/星期二|周二|\b二\b/, 2],
      [/星期三|周三|\b三\b/, 3],
      [/星期四|周四|\b四\b/, 4],
      [/星期五|周五|\b五\b/, 5]
    ];
    const hit = patterns.find(([pattern]) => pattern.test(source));
    return hit ? hit[1] : 0;
  }

  function sectionFromText(text) {
    const source = cleanCourseText(text);
    const rangeMatch = source.match(/(?:第\s*)?(1[0-3]|[1-9])\s*(?:-|－|–|—|~|～|到|至)\s*(1[0-3]|[1-9])\s*节/);
    if (rangeMatch) return { start: Number(rangeMatch[1]), end: Number(rangeMatch[2]) };
    const singleMatch = source.match(/(?:第\s*)?(1[0-3]|[1-9])\s*节/);
    if (singleMatch) return { start: Number(singleMatch[1]), end: Number(singleMatch[1]) };
    return null;
  }

  function weeksFromText(text) {
    const source = cleanCourseText(text);
    const maxWeek = termWeeks;
    let weeks = [];
    let hasLocalParity = false;
    const applyParity = (values, parity) => {
      if (parity === "单") return values.filter((week) => week % 2 === 1);
      if (parity === "双") return values.filter((week) => week % 2 === 0);
      return values;
    };
    const rangePattern = /(\d{1,2})\s*(?:-|－|–|—|~|～|到|至)\s*(\d{1,2})\s*周\s*(?:[（(]\s*(单|双)\s*[）)])?/g;
    let match;
    while ((match = rangePattern.exec(source))) {
      if (match[3]) hasLocalParity = true;
      weeks.push(...applyParity(range(Number(match[1]), Number(match[2])), match[3]));
    }
    const listPattern = /((?:\d{1,2}\s*[,，、]\s*)+\d{1,2})\s*周\s*(?:[（(]\s*(单|双)\s*[）)])?/g;
    while ((match = listPattern.exec(source))) {
      if (match[2]) hasLocalParity = true;
      weeks.push(...applyParity(match[1].split(/[,，、]/).map(Number), match[2]));
    }
    const singlePattern = /(?:^|[^\d-])(?:第\s*)?(\d{1,2})\s*周\s*(?:[（(]\s*(单|双)\s*[）)])?/g;
    while ((match = singlePattern.exec(source))) {
      if (match[2]) hasLocalParity = true;
      weeks.push(...applyParity([Number(match[1])], match[2]));
    }
    if (!weeks.length) return null;
    if (!hasLocalParity && /单周|\(单\)|（单）/.test(source)) weeks = weeks.filter((week) => week % 2 === 1);
    if (!hasLocalParity && /双周|\(双\)|（双）/.test(source)) weeks = weeks.filter((week) => week % 2 === 0);
    return uniqueNumbers(weeks).filter((week) => week >= 1 && week <= maxWeek);
  }


  function detectCredit(value) {
    const source = cleanCourseText(value);
    const compact = source.replace(/\s+/g, "");
    const compactLabeled = compact.match(/(?:学分|credit|xf)[:：]?(\d+(?:\.\d+)?)/i);
    if (compactLabeled) return formatCredit(compactLabeled[1]);
    const labeled = source.match(/(?:学分|credit|xf)\s*[:：]?\s*(\d+(?:\.\d+)?)/i);
    if (labeled) return formatCredit(labeled[1]);
    const directSource = source.trim();
    if (/^\d+(?:\.\d+)?$/.test(directSource)) {
      const direct = Number(directSource);
      if (direct > 0 && direct <= 10) return formatCredit(directSource);
    }
    const lines = source.split(/\n+/).map((line) => cleanupImportLine(line)).filter(Boolean);
    const joinedLines = lines.join("");
    const splitLabel = joinedLines.match(/学分[:：]?(\d+(?:\.\d+)?)/);
    if (splitLabel) return formatCredit(splitLabel[1]);
    const decimalLine = [...lines].reverse().find((line) => /^\d+\.\d+$/.test(line) && Number(line) > 0 && Number(line) <= 10);
    if (decimalLine) return formatCredit(decimalLine);
    const labeledLoose = source.match(/(?:^|\n|\s)(\d+\.\d+)(?:\s*学分)?(?:\n|\s|$)/);
    if (labeledLoose && Number(labeledLoose[1]) > 0 && Number(labeledLoose[1]) <= 10) return formatCredit(labeledLoose[1]);
    return "";
  }

  function formatCredit(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "";
    return Number.isInteger(number) ? String(number) : String(number).replace(/0+$/, "").replace(/\.$/, "");
  }

  function detectCourseName(lines, text) {
    const candidate = lines.map((line) => cleanupImportLine(line)).find(isValidCourseNameLine);
    if (candidate) return cleanupField(candidate);
    const compact = cleanCourseText(text).replace(/星期[一二三四五]|周[一二三四五]|第?\d+\s*[-~到至]?\s*\d*\s*节|\d+\s*[-~到至]\s*\d+\s*周|单周|双周/g, "").trim();
    const fallback = cleanupImportLine(compact.split(/\n|\s{2,}/)[0] || "");
    return isValidCourseNameLine(fallback) ? cleanupField(fallback) : "";
  }

  function detectTeacher(lines, text) {
    const joined = cleanCourseText(text).replace(/\s*\n\s*/g, "");
    const labeled = joined.match(/(?:教师|老师|任课教师)[:：]?\s*([^/\s,，；;]+)/);
    if (labeled) return cleanupField(labeled[1]);
    const candidate = lines.find((line) => /^[\u4e00-\u9fa5]{2,4}$/.test(line) && !/(教|楼|室|场|馆|周|节)$/.test(line));
    return cleanupField(candidate || "");
  }

  function detectRoom(lines, text) {
    const joined = cleanCourseText(text).replace(/\s*\n\s*/g, "").replace(/地\s*点/g, "地点");
    const labeled = joined.match(/(?:场地|地点|地|教室|上课地点)[:：]?\s*([^/，；;]+)/);
    if (labeled) return cleanupField(labeled[1]);
    const candidate = lines.find((line) => /(楼|教室|实验室|机房|场|馆|校区|不在教室)/.test(line));
    return cleanupField(candidate || "");
  }

  function cleanupField(value) {
    return String(value || "")
      .replace(/^(课程名称|课程|教师|老师|地点|教室|上课地点)[:：]/, "")
      .replace(/\s+/g, "")
      .slice(0, 30);
  }

  function cleanCourseText(value) {
    return String(value || "")
      .replace(/&nbsp;/g, " ")
      .replace(/\r/g, "\n")
      .replace(/[\t ]+/g, " ")
      .replace(/\n[\t ]+/g, "\n")
      .replace(/[;；]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function stripHtml(raw) {
    if (!raw.includes("<")) return raw;
    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
    return doc.body ? doc.body.innerText : raw.replace(/<[^>]*>/g, "\n");
  }

  function isHeaderLike(text) {
    const source = cleanCourseText(text);
    return !source || /^(星期|周一|周二|周三|周四|周五|节次|时间|上午|下午|晚上)$/.test(source) || isCourseNoiseLine(source);
  }

  function isCourseNoiseLine(value) {
    const source = cleanCourseText(value);
    if (!source) return true;
    return /^(理论学时|实践学时|实验学时|上机学时|总学时|学时|学分|考试|考查|补考|重修|课程编号|教学班|选课课号|校区|班级|人数|容量|余量|注|注意|提示|说明)[:：]?/i.test(source)
      || /(?:红色斜体|蓝色为已选|待筛选|已选上|请选择记录)/.test(source)
      || /^\(?20\d{2}-20\d{2}-\d\)?[-—]/.test(source)
      || /^\d+(?:\.\d+)?$/.test(source)
      || /^\d{6,}(?:[;；,，]\d{6,})*$/.test(source);
  }

  function isRoomLikeLine(value) {
    const source = cleanCourseText(value);
    return /^(?:下沙|文一|东岳|东边|西边|南楼|北楼)?(?:第?\d+教研楼|第?\d+教学楼|.*(?:教室|实验室|机房|田径场|体育馆|校区|不在教室|楼\d|楼北|楼南|楼中))/.test(source);
  }

  function dedupeImportedCourses(courses) {
    const seen = new Set();
    return courses.filter((course) => {
      const key = [course.name, course.day, course.start, course.end, formatWeeks(course.weeks), course.room, course.teacher].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function visibleDays(schedule) {
    return [1, 2, 3, 4, 5];
  }

  function getCurrentWeek(schedule) {
    const diff = Math.floor((startOfDay(today) - parseISODate(schedule.startDate)) / 86400000);
    return clamp(Math.floor(diff / 7) + 1, 1, schedule.totalWeeks);
  }

  function weekStatus(schedule) {
    const diff = Math.floor((startOfDay(today) - parseISODate(schedule.startDate)) / 86400000);
    if (diff < 0) return "（未开学）";
    if (diff >= schedule.totalWeeks * 7) return "（学期结束）";
    return "";
  }

  function sessionTimeText(schedule, session) {
    const startTime = schedule.timeTable[session.start - 1];
    const endTime = schedule.timeTable[session.end - 1];
    const time = startTime && endTime ? ` ${startTime[0]}-${endTime[1]}` : "";
    return `第 ${session.start}-${session.end} 节${time}`;
  }
  function parseWeeks(input, totalWeeks) {
    const weeks = [];
    String(input)
      .split(/[,，\s]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const match = part.match(/^(\d+)\s*[-~到]\s*(\d+)$/);
        if (match) {
          const start = Math.min(Number(match[1]), Number(match[2]));
          const end = Math.max(Number(match[1]), Number(match[2]));
          weeks.push(...range(start, end));
        } else if (/^\d+$/.test(part)) {
          weeks.push(Number(part));
        }
      });
    return uniqueNumbers(weeks).filter((week) => week >= 1 && week <= totalWeeks);
  }

  function formatWeeks(weeks) {
    const sorted = uniqueNumbers(weeks).sort((a, b) => a - b);
    if (!sorted.length) return "";
    const groups = [];
    let start = sorted[0];
    let previous = sorted[0];
    for (let index = 1; index <= sorted.length; index += 1) {
      const current = sorted[index];
      if (current === previous + 1) {
        previous = current;
        continue;
      }
      groups.push(start === previous ? String(start) : `${start}-${previous}`);
      start = current;
      previous = current;
    }
    return groups.join(",");
  }

  function normalizeTimeTable(timeTable, nodes) {
    const table = Array.isArray(timeTable) ? timeTable : [];
    return range(1, nodes).map((node, index) => {
      const item = table[index];
      const fallback = defaultTimes[index] || defaultTimes[defaultTimes.length - 1];
      if (Array.isArray(item) && item[0] && item[1]) return [item[0], item[1]];
      if (item && item.start && item.end) return [item.start, item.end];
      return [...fallback];
    });
  }

  function cloneDefaultTimeTable(nodes) {
    return normalizeTimeTable(defaultTimes, nodes);
  }

  function tintColor(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#f1f5f9";
    const mix = (channel) => Math.round(channel + (255 - channel) * amount);
    return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
  }

  function shadeColor(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#4b5563";
    const mix = (channel) => Math.round(channel * (1 - amount));
    return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
  }

  function courseTextColor(hex, active = true) {
    const rgb = hexToRgb(hex);
    if (!rgb) return active ? "#4f6670" : "#6b7280";
    const amount = active ? 0.34 : 0.26;
    const mix = (channel) => Math.round(channel * (1 - amount));
    return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
  }

  function hexToRgb(hex) {
    const value = String(hex).replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function startOfWeek(date) {
    const copy = startOfDay(date);
    const day = getChinaWeekday(copy);
    return addDays(copy, 1 - day);
  }

  function getChinaWeekday(date) {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function parseISODate(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function range(start, end) {
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }

  function uniqueNumbers(values) {
    return Array.from(new Set(values.map(Number).filter((value) => Number.isFinite(value)))).sort((a, b) => a - b);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  async function exportScheduleImage() {
    const schedule = currentSchedule();
    if (!schedule?.courses?.length) {
      showToast("还没有课程可导出");
      return;
    }
    closeTopbarMenu();
    showToast("正在生成图片…");
    try {
      const blob = await renderScheduleImageBlob(schedule);
      downloadBlob(blob, `${safeFileName(schedule.name || "FakeUp课表")}-第${state.selectedWeek}周.png`);
      showToast("课表图片已导出");
    } catch (error) {
      console.warn("导出课表图片失败。", error);
      showToast("图片导出失败");
    }
  }

  function renderScheduleImageBlob(schedule) {
    const days = visibleDays(schedule);
    const weekStart = addDays(parseISODate(schedule.startDate), (state.selectedWeek - 1) * 7);
    const width = 1280;
    const margin = 44;
    const titleHeight = 120;
    const dateHeight = 96;
    const timeWidth = 112;
    const rowHeight = 96;
    const height = margin * 2 + titleHeight + dateHeight + rowHeight * schedule.nodes;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const fontFamily = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", SimSun, serif';
    ctx.fillStyle = "#f8fdff";
    ctx.fillRect(0, 0, width, height);
    roundRect(ctx, 20, 20, width - 40, height - 40, 32, "#ffffff");

    ctx.fillStyle = "#1f2937";
    ctx.font = `600 52px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`第 ${state.selectedWeek} 周`, margin, margin);
    ctx.font = `400 28px ${fontFamily}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${schedule.name || "FakeUp"} · ${formatWeekSubtitle(schedule, weekStart)}`, margin, margin + 64);

    const gridLeft = margin;
    const gridTop = margin + titleHeight;
    const dateTop = gridTop;
    const bodyTop = gridTop + dateHeight;
    const gridWidth = width - margin * 2;
    const dayWidth = (gridWidth - timeWidth) / days.length;

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    drawLine(ctx, gridLeft, bodyTop, gridLeft + gridWidth, bodyTop);
    drawLine(ctx, gridLeft + timeWidth, bodyTop, gridLeft + timeWidth, bodyTop + rowHeight * schedule.nodes);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 26px ${fontFamily}`;
    ctx.fillStyle = "#334155";
    ctx.fillText(`${weekStart.getMonth() + 1}月`, gridLeft + timeWidth / 2, dateTop + dateHeight / 2);
    days.forEach((day, index) => {
      const date = addDays(weekStart, day - 1);
      const centerX = gridLeft + timeWidth + dayWidth * index + dayWidth / 2;
      const isToday = isSameDate(date, today);
      if (isToday) {
        roundRect(ctx, centerX - 30, dateTop + 10, 60, 76, 20, "#dbeafe");
      }
      ctx.fillStyle = isToday ? "#1976e8" : "#1f2937";
      ctx.font = `400 28px ${fontFamily}`;
      ctx.fillText(dayNames[day - 1], centerX, dateTop + 30);
      ctx.font = `400 34px ${fontFamily}`;
      ctx.fillText(String(date.getDate()), centerX, dateTop + 68);
      drawLine(ctx, gridLeft + timeWidth + dayWidth * index, bodyTop, gridLeft + timeWidth + dayWidth * index, bodyTop + rowHeight * schedule.nodes);
    });
    drawLine(ctx, gridLeft + gridWidth, bodyTop, gridLeft + gridWidth, bodyTop + rowHeight * schedule.nodes);

    for (let node = 1; node <= schedule.nodes; node += 1) {
      const y = bodyTop + (node - 1) * rowHeight;
      drawDashedLine(ctx, gridLeft, y, gridLeft + gridWidth, y, "#e7edf3");
      ctx.fillStyle = "#1f2937";
      ctx.font = `400 38px ${fontFamily}`;
      ctx.fillText(String(node), gridLeft + timeWidth / 2, y + rowHeight / 2);
    }
    drawDashedLine(ctx, gridLeft, bodyTop + rowHeight * schedule.nodes, gridLeft + gridWidth, bodyTop + rowHeight * schedule.nodes, "#e7edf3");

    const visibleItems = collapseEquivalentSessions(schedule.courses
      .flatMap((course) => courseRenderItems(course, state.selectedWeek))
      .filter((item) => days.includes(item.day))
      .filter((item) => item.isActive || schedule.showOtherWeek));
    layoutCourseItems(visibleItems).forEach((item) => {
      const dayIndex = days.indexOf(item.day);
      if (dayIndex < 0) return;
      const gap = 4;
      const x = gridLeft + timeWidth + dayWidth * dayIndex + dayWidth * item.laneIndex / item.laneCount + gap;
      const y = bodyTop + (item.start - 1) * rowHeight + gap;
      const w = dayWidth / item.laneCount - gap * 2;
      const h = (item.end - item.start + 1) * rowHeight - gap * 2;
      const bg = tintColor(item.course.color, item.isActive ? 0.78 : 0.9);
      const textColor = item.isActive ? courseTextColor(item.course.color) : "#6f7785";
      roundRect(ctx, x, y, w, h, 18, bg);
      roundRect(ctx, x, y, w, 12, { tl: 18, tr: 18, br: 0, bl: 0 }, tintColor(item.course.color, item.isActive ? 0.08 : 0.38));
      const lines = [item.course.name];
      if (!item.isActive) lines.push("非本周");
      if (item.teacher) lines.push(item.teacher);
      if (item.room) lines.push(item.room);
      ctx.fillStyle = textColor;
      ctx.font = `500 ${item.laneCount > 1 ? 20 : 23}px ${fontFamily}`;
      drawWrappedCenteredLines(ctx, lines, x + 10, y + 20, w - 20, h - 30, item.laneCount > 1 ? 24 : 28);
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("canvas toBlob failed")), "image/png", 0.95);
    });
  }

  function formatWeekSubtitle(schedule, weekStart) {
    const weekEnd = addDays(weekStart, 4);
    return `${schedule.startDate.slice(0, 4)}-${schedule.startDate.slice(5, 7)} · ${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  }

  function drawWrappedCenteredLines(ctx, groups, x, y, width, height, lineHeight) {
    const lines = groups.flatMap((group, index) => {
      const wrapped = wrapTextForCanvas(ctx, String(group || ""), width);
      return index ? ["", ...wrapped] : wrapped;
    }).filter((line, index, array) => line || array[index - 1] !== "");
    const visible = lines.slice(0, Math.max(1, Math.floor(height / lineHeight)));
    let currentY = y + Math.max(0, (height - visible.length * lineHeight) / 2) + lineHeight / 2;
    visible.forEach((line) => {
      if (line) ctx.fillText(line, x + width / 2, currentY);
      currentY += lineHeight;
    });
  }

  function wrapTextForCanvas(ctx, text, width) {
    const chars = Array.from(text);
    const lines = [];
    let line = "";
    chars.forEach((char) => {
      const next = line + char;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, width, height, radius, fillStyle) {
    const r = typeof radius === "number" ? { tl: radius, tr: radius, br: radius, bl: radius } : radius;
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawDashedLine(ctx, x1, y1, x2, y2, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.setLineDash([8, 8]);
    drawLine(ctx, x1, y1, x2, y2);
    ctx.restore();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFileName(value) {
    return String(value || "FakeUp课表").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 40) || "FakeUp课表";
  }

  function showPdfDebugJson(records) {
    if (!elements.pdfDebugPanel || !elements.pdfDebugText) return;
    elements.pdfDebugText.textContent = JSON.stringify(records, null, 2);
    elements.pdfDebugPanel.hidden = false;
  }

  function hidePdfDebugJson() {
    if (elements.pdfDebugPanel) elements.pdfDebugPanel.hidden = true;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 1600);
  }

  elements.prevWeekBtn?.addEventListener("click", () => {
    state.selectedWeek = clamp(state.selectedWeek - 1, 1, currentSchedule().totalWeeks);
    saveState();
    render();
  });

  elements.nextWeekBtn?.addEventListener("click", () => {
    state.selectedWeek = clamp(state.selectedWeek + 1, 1, currentSchedule().totalWeeks);
    saveState();
    render();
  });

  elements.currentWeekBtn.addEventListener("click", () => {
    state.selectedWeek = getCurrentWeek(currentSchedule());
    saveState();
    closeTopbarMenu();
    render();
  });
  elements.weekPickerBtn?.addEventListener("click", openWeekPicker);
  elements.weekSelect?.addEventListener("change", () => {
    state.selectedWeek = clamp(Number(elements.weekSelect.value) || 1, 1, currentSchedule().totalWeeks);
    saveState();
    render();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeWeekPicker();
      closeTopbarMenu();
      closeSignInPanel();
    }
  });
  elements.toggleOtherWeekBtn?.addEventListener("click", () => {
    const schedule = currentSchedule();
    schedule.showOtherWeek = !schedule.showOtherWeek;
    saveState();
    closeTopbarMenu();
    render();
  });
  elements.topbarMenuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleTopbarMenu();
  });
  elements.topbarMenu?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", closeTopbarMenu);

  elements.closePdfDebugBtn?.addEventListener("click", hidePdfDebugJson);
  elements.openSignInBtn?.addEventListener("click", openSignInPanel);
  elements.closeSignInBtn?.addEventListener("click", closeSignInPanel);
  elements.signinBackdrop?.addEventListener("click", closeSignInPanel);
  elements.signInAccountLoginBtn?.addEventListener("click", loginSignInAccount);
  elements.signInSubmitBtn?.addEventListener("click", submitSignInCode);
  elements.signInCodeInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitSignInCode();
  });
  elements.openSettingsBtn?.addEventListener("click", openSettingsDialog);
  elements.exportImageBtn?.addEventListener("click", exportScheduleImage);
  elements.openImportBtn.addEventListener("click", () => {
    closeTopbarMenu();
    elements.pdfFileInput?.click();
  });
  elements.newScheduleBtn.addEventListener("click", createNewSchedule);
  elements.saveSettingsBtn.addEventListener("click", saveSettingsFromDialog);
  elements.deleteScheduleBtn.addEventListener("click", deleteCurrentSchedule);
  elements.pdfFileInput?.addEventListener("change", () => importPdfFile(elements.pdfFileInput.files?.[0]));
  elements.sheetBackdrop.addEventListener("click", hideCourseDetail);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideCourseDetail();
  });


  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=fakeup-pwa-22").catch(() => {});
    });
  }

  registerServiceWorker();
  render();
})();










