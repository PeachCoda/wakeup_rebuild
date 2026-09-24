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
    appShell: document.querySelector(".app-shell"),
    pageBackground: document.querySelector("#pageBackground"),
    pageBackgroundBlur: document.querySelector("#pageBackgroundBlur"),
    pageBackgroundMain: document.querySelector("#pageBackgroundMain"),
    prevWeekBtn: document.querySelector("#prevWeekBtn"),
    nextWeekBtn: document.querySelector("#nextWeekBtn"),
    currentWeekBtn: document.querySelector("#currentWeekBtn"),
    toggleOtherWeekBtn: document.querySelector("#toggleOtherWeekBtn"),
    topbarMenuBtn: document.querySelector("#topbarMenuBtn"),
    topbarMenu: document.querySelector("#topbarMenu"),
    openSettingsBtn: document.querySelector("#openSettingsBtn"),
    openAccountBtn: document.querySelector("#openAccountBtn"),
    syncSklScheduleBtn: document.querySelector("#syncSklScheduleBtn"),
    exportImageBtn: document.querySelector("#exportImageBtn"),
    openBackgroundBtn: document.querySelector("#openBackgroundBtn"),
    backgroundBackdrop: document.querySelector("#backgroundBackdrop"),
    backgroundPanel: document.querySelector("#backgroundPanel"),
    backgroundPreview: document.querySelector("#backgroundPreview"),
    backgroundOpacityInput: document.querySelector("#backgroundOpacityInput"),
    backgroundOpacityValue: document.querySelector("#backgroundOpacityValue"),
    closeBackgroundBtn: document.querySelector("#closeBackgroundBtn"),
    backgroundInput: document.querySelector("#backgroundInput"),
    clearBackgroundBtn: document.querySelector("#clearBackgroundBtn"),
    backgroundScaleField: document.querySelector("#backgroundScaleField"),
    backgroundCropStage: document.querySelector("#backgroundPreview"),
    backgroundCropScaleInput: document.querySelector("#backgroundCropScaleInput"),
    backgroundCropScaleValue: document.querySelector("#backgroundCropScaleValue"),
    newScheduleBtn: document.querySelector("#newScheduleBtn"),
    settingsDialog: document.querySelector("#settingsDialog"),
    settingName: document.querySelector("#settingName"),
    settingStartDate: document.querySelector("#settingStartDate"),
    settingCellHeight: document.querySelector("#settingCellHeight"),
    saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
    deleteScheduleBtn: document.querySelector("#deleteScheduleBtn"),
    sheetBackdrop: document.querySelector("#sheetBackdrop"),
    courseSheet: document.querySelector("#courseSheet"),
    courseDetail: document.querySelector("#courseDetail"),
    signinBackdrop: document.querySelector("#signinBackdrop"),
    signinPanel: document.querySelector("#signinPanel"),
    signinCurrentCourse: document.querySelector("#signinCurrentCourse"),
    signInPanelTitle: document.querySelector("#signInPanelTitle"),
    signinStatus: document.querySelector("#signinStatus"),
    signInLocationStatus: document.querySelector("#signInLocationStatus"),
    signInLoginFields: document.querySelector("#signInLoginFields"),
    signInCodeField: document.querySelector("#signInCodeField"),
    signInUsernameInput: document.querySelector("#signInUsernameInput"),
    signInPasswordInput: document.querySelector("#signInPasswordInput"),
    signInCodeInput: document.querySelector("#signInCodeInput"),
    signInCodeSlots: Array.from(document.querySelectorAll(".signin-code-slot")),
    signInKeypad: document.querySelector("#signInKeypad"),
    signInCaptcha: document.querySelector("#signInCaptcha"),
    signInCaptchaTrigger: document.querySelector("#signInCaptchaTrigger"),
    closeSignInBtn: document.querySelector("#closeSignInBtn"),
    signInAccountLoginBtn: document.querySelector("#signInAccountLoginBtn"),
    signInSubmitBtn: document.querySelector("#signInSubmitBtn"),
    toast: document.querySelector("#toast")
  };


  let state = loadState();
  let signInCaptchaReadyPromise = null;
  let signInCaptchaReady = false;
  let signInCaptchaSubmitTimer = null;
  let signInPositionCache = null;
  let signInPositionCacheAt = 0;
  let signInPositionPending = null;
  let signInAccountLoggedIn = false;
  let signInAutoSubmitTimer = null;
  let backgroundCropState = null;
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
          backgroundImage: "",
          backgroundOpacity: 70,
          backgroundAspect: 0,
          backgroundScale: 1,
          backgroundOffsetX: 0,
          backgroundOffsetY: 0,
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
        backgroundImage: typeof schedule.backgroundImage === "string" ? schedule.backgroundImage : "",
        backgroundOpacity: clamp(Number(schedule.backgroundOpacity) || 70, 20, 100),
        backgroundAspect: Math.max(0, Number(schedule.backgroundAspect) || 0),
        backgroundScale: clamp(Number(schedule.backgroundScale) || 1, 1, 3),
        backgroundOffsetX: clamp(Number(schedule.backgroundOffsetX) || 0, -1, 1),
        backgroundOffsetY: clamp(Number(schedule.backgroundOffsetY) || 0, -1, 1),
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

  function applyScheduleBackground(schedule) {
    const value = schedule?.backgroundImage || "";
    const opacity = clamp(Number(schedule?.backgroundOpacity) || 70, 20, 100);
    const strength = opacity / 100;
    const shellAlpha = Math.max(0.34, 0.9 - strength * 0.5).toFixed(2);
    const panelAlpha = Math.max(0.38, 0.9 - strength * 0.46).toFixed(2);
    const wrapAlpha = Math.max(0.03, 0.34 - strength * 0.26).toFixed(2);
    const gridAlpha = Math.max(0.02, 0.2 - strength * 0.16).toFixed(2);
    document.documentElement.style.setProperty("--bg-strength", String(strength));
    document.documentElement.style.setProperty("--bg-shell-alpha", shellAlpha);
    document.documentElement.style.setProperty("--bg-panel-alpha", panelAlpha);
    document.documentElement.style.setProperty("--bg-wrap-alpha", wrapAlpha);
    document.documentElement.style.setProperty("--bg-grid-alpha", gridAlpha);
    document.documentElement.style.setProperty("--preview-strength", String(strength));
    applyBackgroundToElement(elements.pageBackgroundBlur, schedule, { blur: true });
    applyBackgroundToElement(elements.pageBackgroundMain, schedule);
    if (elements.appShell) {
      elements.appShell.style.backgroundImage = "";
      elements.appShell.style.backgroundSize = "";
      elements.appShell.style.backgroundPosition = "";
    }
    updateBackgroundSettingsUi(schedule);
    document.documentElement.classList.toggle("has-custom-bg", Boolean(value));
  }

  function getBackgroundMetrics(schedule, width, height, extraScale = 1) {
    const aspect = Math.max(0, Number(schedule?.backgroundAspect) || 0);
    if (!aspect) return null;
    const containerAspect = width / Math.max(1, height);
    const coverWidth = containerAspect > aspect ? width : height * aspect;
    const coverHeight = containerAspect > aspect ? width / aspect : height;
    const scale = clamp(Number(schedule?.backgroundScale) || 1, 1, 3) * extraScale;
    const drawWidth = coverWidth * scale;
    const drawHeight = coverHeight * scale;
    const maxOffsetX = Math.max(0, (drawWidth - width) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - height) / 2);
    const offsetX = clamp((Number(schedule?.backgroundOffsetX) || 0) * width, -maxOffsetX, maxOffsetX);
    const offsetY = clamp((Number(schedule?.backgroundOffsetY) || 0) * height, -maxOffsetY, maxOffsetY);
    return { drawWidth, drawHeight, offsetX, offsetY };
  }

  function applyBackgroundToElement(element, schedule, options = {}) {
    if (!element) return;
    const value = schedule?.backgroundImage || "";
    if (!value) {
      element.style.backgroundImage = "";
      element.style.backgroundSize = "";
      element.style.backgroundPosition = "";
      return;
    }
    const rect = element.getBoundingClientRect();
    const width = Math.max(1, rect.width || window.innerWidth);
    const height = Math.max(1, rect.height || window.innerHeight);
    const metrics = getBackgroundMetrics(schedule, width, height, options.blur ? 1.08 : 1);
    element.style.backgroundImage = `url(${JSON.stringify(value)})`;
    if (!metrics) {
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
      return;
    }
    element.style.backgroundSize = `${metrics.drawWidth.toFixed(1)}px ${metrics.drawHeight.toFixed(1)}px`;
    element.style.backgroundPosition = `calc(50% + ${metrics.offsetX.toFixed(1)}px) calc(50% + ${metrics.offsetY.toFixed(1)}px)`;
  }

  function updateBackgroundSettingsUi(schedule = currentSchedule()) {
    const opacity = clamp(Number(schedule?.backgroundOpacity) || 70, 20, 100);
    if (elements.backgroundOpacityInput) elements.backgroundOpacityInput.value = String(opacity);
    if (elements.backgroundOpacityValue) elements.backgroundOpacityValue.textContent = `${opacity}%`;
    updateBackgroundPreviewAspect();
    if (elements.backgroundPreview) {
      const image = schedule?.backgroundImage ? `url(${JSON.stringify(schedule.backgroundImage)})` : "";
      elements.backgroundPreview.classList.toggle("empty", !image);
      elements.backgroundPreview.style.setProperty("--preview-bg", image || "none");
      elements.backgroundPreview.style.setProperty("--preview-strength", String(opacity / 100));
      if (image) {
        const rect = elements.backgroundPreview.getBoundingClientRect();
        const metrics = getBackgroundMetrics(schedule, Math.max(1, rect.width || 1), Math.max(1, rect.height || 1));
        elements.backgroundPreview.style.setProperty("--preview-bg-size", metrics ? `${metrics.drawWidth.toFixed(1)}px ${metrics.drawHeight.toFixed(1)}px` : "cover");
        elements.backgroundPreview.style.setProperty("--preview-bg-position", metrics ? `calc(50% + ${metrics.offsetX.toFixed(1)}px) calc(50% + ${metrics.offsetY.toFixed(1)}px)` : "center");
      }
      elements.backgroundPreview.innerHTML = image ? "" : "<span>还没有背景图片</span>";
    }
    if (elements.backgroundScaleField) elements.backgroundScaleField.hidden = !schedule?.backgroundImage;
    const scalePercent = Math.round(clamp(Number(schedule?.backgroundScale) || 1, 1, 3) * 100);
    if (elements.backgroundCropScaleInput) elements.backgroundCropScaleInput.value = String(scalePercent);
    if (elements.backgroundCropScaleValue) elements.backgroundCropScaleValue.textContent = `${scalePercent}%`;
  }

  function openBackgroundPanel() {
    closeTopbarMenu();
    updateBackgroundPreviewAspect();
    elements.backgroundBackdrop.hidden = false;
    elements.backgroundPanel.hidden = false;
    window.requestAnimationFrame(() => updateBackgroundSettingsUi());
  }

  function updateBackgroundPreviewAspect() {
    if (!elements.backgroundPreview) return;
    const shellRect = elements.appShell?.getBoundingClientRect();
    const aspect = shellRect?.width && shellRect?.height ? shellRect.width / shellRect.height : window.innerWidth / Math.max(1, window.innerHeight);
    elements.backgroundPreview.style.setProperty("--preview-aspect", String(clamp(aspect, 0.42, 1.8)));
  }

  function closeBackgroundPanel() {
    if (elements.backgroundBackdrop) elements.backgroundBackdrop.hidden = true;
    if (elements.backgroundPanel) elements.backgroundPanel.hidden = true;
  }

  function render() {
    const schedule = currentSchedule();
    state.selectedWeek = clamp(state.selectedWeek, 1, schedule.totalWeeks);
    document.documentElement.style.setProperty("--day-count", visibleDays(schedule).length);
    document.documentElement.style.setProperty("--cell-height", `${schedule.cellHeight}px`);
    applyScheduleBackground(schedule);
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
      empty.innerHTML = "<div><strong>还没有课程</strong><br>请从右上角菜单同步课表</div>";
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
    positionTopbarMenu();
    elements.topbarMenuBtn.setAttribute("aria-expanded", "true");
  }

  function closeTopbarMenu() {
    if (!elements.topbarMenu || !elements.topbarMenuBtn) return;
    elements.topbarMenu.hidden = true;
    elements.topbarMenuBtn.setAttribute("aria-expanded", "false");
  }

  function positionTopbarMenu() {
    if (!elements.topbarMenu || !elements.topbarMenuBtn || elements.topbarMenu.hidden) return;
    const rect = elements.topbarMenuBtn.getBoundingClientRect();
    const menuWidth = elements.topbarMenu.offsetWidth || 190;
    const gap = 8;
    const top = Math.max(8, rect.bottom + gap);
    const left = clamp(rect.right - menuWidth, 8, window.innerWidth - menuWidth - 8);
    elements.topbarMenu.style.top = `${Math.round(top)}px`;
    elements.topbarMenu.style.left = `${Math.round(left)}px`;
    elements.topbarMenu.style.right = "auto";
  }

  function toggleTopbarMenu() {
    if (!elements.topbarMenu || !elements.topbarMenuBtn) return;
    if (elements.topbarMenu.hidden) openTopbarMenu();
    else closeTopbarMenu();
  }


  function updateModalViewportVars() {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    if (!viewport) {
      root.style.removeProperty("--signin-modal-top");
      root.style.removeProperty("--modal-visible-height");
      return;
    }
    const keyboardLikelyOpen = viewport.height < window.innerHeight * 0.82;
    const centerRatio = keyboardLikelyOpen ? 0.52 : 0.5;
    root.style.setProperty("--signin-modal-top", `${Math.round(viewport.offsetTop + viewport.height * centerRatio)}px`);
    root.style.setProperty("--modal-visible-height", `${Math.round(viewport.height)}px`);
  }
  function openSignInPanel(mode = "signin", context = null) {
    closeTopbarMenu();
    const accountMode = mode === "account";
    if (elements.signinPanel) elements.signinPanel.dataset.mode = accountMode ? "account" : "signin";
    if (elements.signInPanelTitle) elements.signInPanelTitle.textContent = accountMode ? "登录上课啦账号" : "签到";
    if (elements.signinCurrentCourse) {
      elements.signinCurrentCourse.hidden = accountMode;
      if (!accountMode) renderSignInCurrentCourse(context);
    }
    loadSavedSignInUsername();
    elements.signinBackdrop.hidden = false;
    elements.signinPanel.hidden = false;
    updateModalViewportVars();
    checkSignInBackend().then(() => checkSignInAccountStatus({ quiet: true }));
  }

  function closeSignInPanel() {
    if (!elements.signinBackdrop || !elements.signinPanel) return;
    elements.signinBackdrop.hidden = true;
    elements.signinPanel.hidden = true;
    document.documentElement.style.removeProperty("--signin-modal-top");
  }

  function renderSignInCurrentCourse(context = null) {
    if (!elements.signinCurrentCourse) return;
    const schedule = currentSchedule();
    let item = null;
    if (context?.courseId) {
      const course = schedule.courses.find((entry) => entry.id === context.courseId);
      const session = course ? (courseSessions(course)[Number(context.sessionIndex) || 0] || courseSessions(course)[0] || course) : null;
      if (course && session) item = { course, ...session };
    }
    item = item || getCurrentLiveCourse(schedule);
    if (!item) {
      elements.signinCurrentCourse.innerHTML = "<strong>当前没有匹配到正在上的课</strong><span>也可以输入密令尝试提交。</span>";
      return;
    }
    const room = item.room ? ` · ${escapeHtml(item.room)}` : "";
    const teacher = item.teacher ? ` · ${escapeHtml(item.teacher)}` : "";
    elements.signinCurrentCourse.innerHTML = `<strong>${escapeHtml(item.course.name)}</strong><span>${escapeHtml(sessionTimeText(schedule, item))}${room}${teacher}</span>`;
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
  }

  function openExternalSignIn() {
    window.open(signInUrl, "_blank", "noopener");
  }

  function setSignInStatus(message, tone = "idle") {
    if (!elements.signinStatus) return;
    elements.signinStatus.textContent = message;
    elements.signinStatus.dataset.tone = tone;
  }

  function setSignInLocationStatus(message, tone = "idle") {
    if (!elements.signInLocationStatus) return;
    elements.signInLocationStatus.textContent = message;
    elements.signInLocationStatus.dataset.tone = tone;
  }

  function formatSignInLocation(coords) {
    if (!coords?.latitude || !coords?.longitude) return "定位：未获取";
    const accuracy = coords.accuracy ? ` · ±${coords.accuracy}m` : "";
    return `定位：${coords.latitude}, ${coords.longitude}${accuracy}`;
  }

  function normalizeSignInCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 4);
  }

  function updateSignInCodeDisplay(value = elements.signInCodeInput?.value || "") {
    const code = normalizeSignInCode(value);
    if (elements.signInCodeInput && elements.signInCodeInput.value !== code) elements.signInCodeInput.value = code;
    elements.signInCodeSlots?.forEach((slot, index) => {
      const digit = code[index] || "";
      slot.textContent = digit;
      slot.classList.toggle("filled", Boolean(digit));
    });
    return code;
  }

  function readSignInCode() {
    return updateSignInCodeDisplay(elements.signInCodeInput?.value || "");
  }

  function clearSignInCode() {
    window.clearTimeout(signInAutoSubmitTimer);
    if (elements.signInCodeInput) elements.signInCodeInput.value = "";
    updateSignInCodeDisplay("");
  }

  function focusSignInCode() {
    updateModalViewportVars();
  }

  function scheduleSignInAutoSubmit(code) {
    if (code.length !== 4 || elements.signInSubmitBtn?.disabled) return;
    window.clearTimeout(signInAutoSubmitTimer);
    signInAutoSubmitTimer = window.setTimeout(() => {
      signInAutoSubmitTimer = null;
      if (readSignInCode().length === 4) submitSignInCode();
    }, 120);
  }

  function pushSignInCodeDigit(digit) {
    const current = readSignInCode();
    if (current.length >= 4) return;
    const next = updateSignInCodeDisplay(`${current}${normalizeSignInCode(digit).slice(0, 1)}`);
    scheduleSignInAutoSubmit(next);
  }

  function popSignInCodeDigit() {
    window.clearTimeout(signInAutoSubmitTimer);
    const current = readSignInCode();
    updateSignInCodeDisplay(current.slice(0, -1));
  }

  function handleSignInKeypadClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    const digit = button.dataset.codeKey;
    const action = button.dataset.codeAction;
    if (digit !== undefined) pushSignInCodeDigit(digit);
    if (action === "backspace") popSignInCodeDigit();
    if (action === "clear") clearSignInCode();
  }

  function handleSignInPanelKeydown(event) {
    if (elements.signinPanel?.hidden || elements.signinPanel?.dataset.loggedIn !== "true") return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      pushSignInCodeDigit(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      popSignInCodeDigit();
    } else if (event.key === "Enter") {
      submitSignInCode();
    }
  }
  function setSignInLoggedIn(loggedIn) {
    const accountMode = elements.signinPanel?.dataset.mode === "account";
    if (elements.signinPanel) elements.signinPanel.dataset.loggedIn = loggedIn ? "true" : "false";
    if (accountMode) {
      if (elements.signInLoginFields) elements.signInLoginFields.hidden = Boolean(loggedIn);
      if (elements.signInAccountLoginBtn) elements.signInAccountLoginBtn.hidden = Boolean(loggedIn);
      if (elements.signInCodeField) elements.signInCodeField.hidden = true;
      if (elements.signInLocationStatus) elements.signInLocationStatus.hidden = true;
      if (elements.signInSubmitBtn) elements.signInSubmitBtn.hidden = true;
      if (!loggedIn && elements.signinPanel && !elements.signinPanel.hidden) requestAnimationFrame(() => elements.signInUsernameInput?.focus());
      return;
    }
    if (elements.signInLoginFields) elements.signInLoginFields.hidden = Boolean(loggedIn);
    if (elements.signInAccountLoginBtn) elements.signInAccountLoginBtn.hidden = Boolean(loggedIn);
    if (elements.signInCodeField) elements.signInCodeField.hidden = !loggedIn;
    if (elements.signInLocationStatus) elements.signInLocationStatus.hidden = !loggedIn;
    if (elements.signInSubmitBtn) elements.signInSubmitBtn.hidden = true;
    if (loggedIn && elements.signinPanel && !elements.signinPanel.hidden) {
      warmSignInPosition({ silent: true });
      requestAnimationFrame(focusSignInCode);
    }
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
      signInAccountLoggedIn = false;
      if (elements.openAccountBtn) elements.openAccountBtn.textContent = "登录";
      setSignInLoggedIn(false);
      setSignInStatus("第一次使用需要先登录。", "warn");
      return;
    }
    signInAccountLoggedIn = true;
    const userName = data?.user?.userName || data?.user?.name || data?.user?.id || "已登录";
    if (elements.openAccountBtn) elements.openAccountBtn.textContent = "签到";
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
      if (elements.openAccountBtn) elements.openAccountBtn.textContent = "登录";
      setSignInLoggedIn(false);
      setSignInStatus(error?.message || "读取上课啦账号状态失败", "bad");
      return null;
    }
  }

  async function loginSignInAccount() {
    const username = elements.signInUsernameInput?.value.trim() || "";
    const password = elements.signInPasswordInput?.value || "";
    if (!username || !password) {
      setSignInStatus("请输入学号和密码。", "warn");
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
    } catch (error) {
      setSignInStatus(error?.message || "上课啦登录失败", "bad");
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
            if (passed) clearSignInCode();
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

  function emptySignInPosition() {
    return { latitude: "", longitude: "" };
  }

  function readSignInPosition(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = {
          latitude: Number(position.coords.latitude).toFixed(6),
          longitude: Number(position.coords.longitude).toFixed(6),
          accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : ""
        };
        signInPositionCache = coords;
        signInPositionCacheAt = Date.now();
        setSignInLocationStatus(formatSignInLocation(coords), "ok");
        resolve(coords);
      }, reject, options);
    });
  }

  function hasFreshSignInPosition() {
    return signInPositionCache && Date.now() - signInPositionCacheAt < 10 * 60 * 1000;
  }

  function signInLocationErrorMessage(error) {
    if (error?.code === 1) return "定位：未授权";
    if (error?.code === 2) return "定位：暂时不可用";
    if (error?.code === 3) return "定位：仍在获取";
    return "定位：未获取";
  }

  async function warmSignInPosition(options = {}) {
    if (hasFreshSignInPosition()) {
      setSignInLocationStatus(formatSignInLocation(signInPositionCache), "ok");
      return signInPositionCache;
    }
    if (!navigator.geolocation) {
      setSignInLocationStatus("定位：当前浏览器不支持", "warn");
      return null;
    }
    if (!signInPositionPending) {
      setSignInLocationStatus("定位：正在获取…", "idle");
      signInPositionPending = readSignInPosition({ enableHighAccuracy: false, timeout: 6000, maximumAge: 30 * 60 * 1000 })
        .catch((error) => {
          const message = signInLocationErrorMessage(error);
          const tone = error?.code === 1 ? "bad" : "warn";
          const suffix = error?.code === 1 ? "，请允许定位" : "，可先提交";
          setSignInLocationStatus(`${message}${suffix}`, tone);
          if (!options.silent && error?.code === 1) throw new Error("需要允许定位后才能签到");
          return null;
        })
        .finally(() => {
          signInPositionPending = null;
        });
    } else {
      setSignInLocationStatus("定位：正在获取…", "idle");
    }
    return signInPositionPending;
  }

  async function getSignInPosition(options = {}) {
    if (hasFreshSignInPosition()) {
      setSignInLocationStatus(formatSignInLocation(signInPositionCache), "ok");
      return signInPositionCache;
    }
    if (!navigator.geolocation) {
      setSignInLocationStatus("定位：当前浏览器不支持", "warn");
      return emptySignInPosition();
    }
    try {
      const warmed = await Promise.race([
        warmSignInPosition({ silent: false }),
        new Promise((resolve) => window.setTimeout(() => resolve(null), options.quick ? 1800 : 4000))
      ]);
      if (warmed) return warmed;
      setSignInLocationStatus("定位：仍在获取，可先提交", "warn");
      return emptySignInPosition();
    } catch (error) {
      if (error?.code === 1 || /允许定位/.test(error?.message || "")) throw new Error("需要允许定位后才能签到");
      setSignInLocationStatus("定位：暂时没返回，可先提交", "warn");
      return emptySignInPosition();
    }
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
    const code = readSignInCode();
    if (!code) {
      finishSignInSubmit();
      setSignInStatus("请输入密令。", "warn");
      return { captchaResult: true, bizResult: false };
    }
    try {
      const position = await getSignInPosition({ quick: true });
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
        clearSignInCode();
        return { captchaResult: true, bizResult: true };
      }
      const message = signInResultMessage(data);
      finishSignInSubmit();
      setSignInStatus(message, data?.code === "captcha_rejected" ? "warn" : "bad");
      return { captchaResult: data?.code === "captcha_rejected" ? false : true, bizResult: false };
    } catch (error) {
      finishSignInSubmit();
      const message = error?.message || "提交失败";
      setSignInStatus(message, "bad");
      return { captchaResult: true, bizResult: false };
    }
  }

  async function submitSignInCode() {
    const code = readSignInCode();
    if (!code) {
      setSignInStatus("请输入密令。", "warn");
      focusSignInCode();
      return;
    }
    if (elements.signInSubmitBtn?.disabled) return;
    if (elements.signInSubmitBtn) elements.signInSubmitBtn.disabled = true;
    setSignInStatus("正在准备验证码…");
    warmSignInPosition({ silent: true });
    try {
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
    state.selectedWeek = getCurrentWeek(schedule);
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


  function applyImportedCourses(parsed, options = {}) {
    const schedule = currentSchedule();
    const merged = mergeImportedCourseSessions(parsed);
    schedule.courses = merged.map((course, index) => normalizeCourse({
      id: uid(),
      color: courseColor(index),
      ...course
    })).filter(Boolean);
    schedule.nodes = 13;
    if (options.startDate) schedule.startDate = options.startDate;
    schedule.totalWeeks = termWeeks;
    schedule.showWeekend = false;
    schedule.timeTable = cloneDefaultTimeTable(13);
    state.selectedWeek = getCurrentWeek(schedule);
    saveState();
    render();
    showToast(`已导入 ${schedule.courses.length} 门课程`);
  }

  async function syncSklSchedule() {
    closeTopbarMenu();
    const schedule = currentSchedule();
    showToast("正在同步上课啦课表…");
    try {
      const response = await fetch(`${signInApiBase}/schedule/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: schedule.startDate, todayDate: toISODate(today), weeks: schedule.totalWeeks || termWeeks, userAgent: navigator.userAgent })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        showToast(data?.message || "请先登录上课啦账号");
        openSignInPanel("account");
        return;
      }
      if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
      if (!Array.isArray(data.courses) || !data.courses.length) {
        showToast("上课啦没有返回课程");
        return;
      }
      applyImportedCourses(data.courses, { startDate: data.startDate });
      showToast(`已同步 ${currentSchedule().courses.length} 门课程`);
    } catch (error) {
      showToast(error?.message ? `同步失败：${error.message}` : "同步上课啦课表失败");
    }
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

  function isLegendText(value) {
    const source = cleanCourseText(value);
    return /(?:注[:：]|注意|提示|说明|红色斜体|蓝色为已选|待筛选|已选上|请选择记录)/.test(source);
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

  async function renderScheduleImageBlob(schedule) {
    const days = visibleDays(schedule);
    const weekStart = addDays(parseISODate(schedule.startDate), (state.selectedWeek - 1) * 7);
    const width = 920;
    const margin = 22;
    const titleHeight = 118;
    const dateHeight = 86;
    const timeWidth = 76;
    const rowHeight = 104;
    const height = margin * 2 + titleHeight + dateHeight + rowHeight * schedule.nodes;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const fontFamily = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", SimSun, serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const backgroundImage = schedule.backgroundImage ? await loadCanvasImage(schedule.backgroundImage).catch(() => null) : null;
    const backgroundOpacity = clamp(Number(schedule.backgroundOpacity) || 70, 20, 100) / 100;
    if (backgroundImage) {
      ctx.save();
      ctx.globalAlpha = backgroundOpacity;
      ctx.filter = "blur(24px)";
      drawImageCoverAdjusted(ctx, backgroundImage, -36, -36, width + 72, height + 72, schedule, 1.08);
      ctx.filter = "none";
      drawImageCoverAdjusted(ctx, backgroundImage, 0, 0, width, height, schedule);
      ctx.restore();
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.7 - backgroundOpacity * 0.22).toFixed(2)})`;
      ctx.fillRect(0, 0, width, height);
    }
    roundRect(ctx, 12, 12, width - 24, height - 24, 28, backgroundImage ? `rgba(255, 255, 255, ${(0.76 - backgroundOpacity * 0.22).toFixed(2)})` : "#ffffff");

    ctx.fillStyle = "#1f2937";
    ctx.font = `600 46px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`第 ${state.selectedWeek} 周`, margin, margin);
    ctx.font = `400 24px ${fontFamily}`;
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${schedule.name || "FakeUp"} · ${formatWeekSubtitle(schedule, weekStart)}`, margin, margin + 58);

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
        roundRect(ctx, centerX - 30, dateTop + 8, 60, 70, 20, "#dbeafe");
      }
      ctx.fillStyle = isToday ? "#1976e8" : "#1f2937";
      ctx.font = `400 24px ${fontFamily}`;
      ctx.fillText(dayNames[day - 1], centerX, dateTop + 26);
      ctx.font = `400 32px ${fontFamily}`;
      ctx.fillText(String(date.getDate()), centerX, dateTop + 62);
      drawLine(ctx, gridLeft + timeWidth + dayWidth * index, bodyTop, gridLeft + timeWidth + dayWidth * index, bodyTop + rowHeight * schedule.nodes);
    });
    drawLine(ctx, gridLeft + gridWidth, bodyTop, gridLeft + gridWidth, bodyTop + rowHeight * schedule.nodes);

    for (let node = 1; node <= schedule.nodes; node += 1) {
      const y = bodyTop + (node - 1) * rowHeight;
      drawDashedLine(ctx, gridLeft, y, gridLeft + gridWidth, y, "#e7edf3");
      ctx.fillStyle = "#1f2937";
      const time = schedule.timeTable[node - 1] || defaultTimes[node - 1] || ["", ""];
      ctx.font = `400 22px ${fontFamily}`;
      ctx.fillText(time[0] || "", gridLeft + timeWidth / 2, y + 25);
      ctx.font = `400 34px ${fontFamily}`;
      ctx.fillText(String(node), gridLeft + timeWidth / 2, y + rowHeight / 2);
      ctx.font = `400 22px ${fontFamily}`;
      ctx.fillText(time[1] || "", gridLeft + timeWidth / 2, y + rowHeight - 24);
    }
    drawDashedLine(ctx, gridLeft, bodyTop + rowHeight * schedule.nodes, gridLeft + gridWidth, bodyTop + rowHeight * schedule.nodes, "#e7edf3");

    const visibleItems = collapseEquivalentSessions(schedule.courses
      .flatMap((course) => courseRenderItems(course, state.selectedWeek))
      .filter((item) => days.includes(item.day))
      .filter((item) => item.isActive || schedule.showOtherWeek));
    layoutCourseItems(visibleItems).forEach((item) => {
      const dayIndex = days.indexOf(item.day);
      if (dayIndex < 0) return;
      const gap = 2;
      const x = gridLeft + timeWidth + dayWidth * dayIndex + dayWidth * item.laneIndex / item.laneCount + gap;
      const y = bodyTop + (item.start - 1) * rowHeight + gap;
      const w = dayWidth / item.laneCount - gap * 2;
      const h = (item.end - item.start + 1) * rowHeight - gap * 2;
      const cardGradient = ctx.createLinearGradient(x, y, x, y + h);
      cardGradient.addColorStop(0, tintColor(item.course.color, item.isActive ? 0.7 : 0.86));
      cardGradient.addColorStop(0.62, tintColor(item.course.color, item.isActive ? 0.82 : 0.92));
      cardGradient.addColorStop(1, tintColor(item.course.color, item.isActive ? 0.9 : 0.96));
      const stripeGradient = ctx.createLinearGradient(x, y, x + w, y);
      stripeGradient.addColorStop(0, tintColor(item.course.color, item.isActive ? 0.16 : 0.48));
      stripeGradient.addColorStop(1, tintColor(item.course.color, item.isActive ? 0.36 : 0.64));
      const textColor = item.isActive ? courseTextColor(item.course.color) : "#536071";
      ctx.save();
      ctx.shadowColor = item.isActive ? "rgba(42, 82, 108, 0.08)" : "rgba(42, 82, 108, 0.04)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      roundRect(ctx, x, y, w, h, 18, cardGradient);
      ctx.restore();
      strokeRoundRect(ctx, x + 0.6, y + 0.6, w - 1.2, h - 1.2, 18, "rgba(255, 255, 255, 0.66)", 1.2);
      roundRect(ctx, x, y, w, 12, { tl: 18, tr: 18, br: 0, bl: 0 }, stripeGradient);
      const lines = [item.course.name];
      if (!item.isActive) lines.push("非本周");
      if (item.teacher) lines.push(item.teacher);
      if (item.room) lines.push(item.room);
      ctx.fillStyle = textColor;
      ctx.font = `600 ${item.laneCount > 1 ? 18 : 21}px ${fontFamily}`;
      drawWrappedCenteredLines(ctx, lines, x + 9, y + 18, w - 18, h - 28, item.laneCount > 1 ? 23 : 27);
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("canvas toBlob failed")), "image/png", 0.95);
    });
  }


  function loadCanvasImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function drawImageCover(ctx, image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function drawImageCoverAdjusted(ctx, image, x, y, width, height, schedule, extraScale = 1) {
    const metrics = getBackgroundMetrics(schedule, width, height, extraScale);
    if (!metrics) {
      drawImageCover(ctx, image, x, y, width, height);
      return;
    }
    const drawX = x + width / 2 + metrics.offsetX - metrics.drawWidth / 2;
    const drawY = y + height / 2 + metrics.offsetY - metrics.drawHeight / 2;
    ctx.drawImage(image, drawX, drawY, metrics.drawWidth, metrics.drawHeight);
  }

  function drawImageContain(ctx, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => loadCanvasImage(reader.result)
        .then((image) => resizeWallpaperSource(image))
        .then(resolve)
        .catch(reject);
      reader.readAsDataURL(file);
    });
  }

  function resizeWallpaperSource(image) {
    const maxSide = 1800;
    const resize = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * resize));
    const height = Math.max(1, Math.round(image.height * resize));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const src = canvas.toDataURL("image/jpeg", 0.84);
    return loadCanvasImage(src).then((resizedImage) => ({ image: resizedImage, src }));
  }

  function updateBackgroundCropTransform() {
    const schedule = currentSchedule();
    saveState();
    applyScheduleBackground(schedule);
  }

  function updateBackgroundCropScale() {
    const schedule = currentSchedule();
    if (!schedule?.backgroundImage) return;
    schedule.backgroundScale = clamp(Number(elements.backgroundCropScaleInput?.value) || 100, 100, 300) / 100;
    updateBackgroundCropTransform();
  }

  function handleBackgroundCropPointerDown(event) {
    const schedule = currentSchedule();
    if (!schedule?.backgroundImage || !elements.backgroundCropStage) return;
    backgroundCropState = { dragging: true, lastX: event.clientX, lastY: event.clientY };
    elements.backgroundCropStage.setPointerCapture?.(event.pointerId);
  }

  function handleBackgroundCropPointerMove(event) {
    if (!backgroundCropState?.dragging || !elements.backgroundCropStage) return;
    event.preventDefault();
    const rect = elements.backgroundCropStage.getBoundingClientRect();
    const schedule = currentSchedule();
    schedule.backgroundOffsetX = clamp((Number(schedule.backgroundOffsetX) || 0) + (event.clientX - backgroundCropState.lastX) / Math.max(1, rect.width), -1, 1);
    schedule.backgroundOffsetY = clamp((Number(schedule.backgroundOffsetY) || 0) + (event.clientY - backgroundCropState.lastY) / Math.max(1, rect.height), -1, 1);
    backgroundCropState.lastX = event.clientX;
    backgroundCropState.lastY = event.clientY;
    updateBackgroundCropTransform();
  }

  function handleBackgroundCropPointerUp(event) {
    if (!backgroundCropState) return;
    backgroundCropState.dragging = false;
    elements.backgroundCropStage?.releasePointerCapture?.(event.pointerId);
    backgroundCropState = null;
  }

  async function handleBackgroundInputChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件");
      return;
    }
    try {
      const { image, src } = await readImageFile(file);
      const schedule = currentSchedule();
      schedule.backgroundImage = src;
      schedule.backgroundAspect = image.width / Math.max(1, image.height);
      schedule.backgroundScale = 1;
      schedule.backgroundOffsetX = 0;
      schedule.backgroundOffsetY = 0;
      saveState();
      applyScheduleBackground(schedule);
      render();
      openBackgroundPanel();
      showToast("背景已替换");
    } catch (error) {
      console.warn("读取背景失败。", error);
      showToast("图片读取失败");
    }
  }

  function clearBackgroundImage() {
    const schedule = currentSchedule();
    schedule.backgroundImage = "";
    schedule.backgroundAspect = 1;
    schedule.backgroundScale = 1;
    schedule.backgroundOffsetX = 0;
    schedule.backgroundOffsetY = 0;
    saveState();
    applyScheduleBackground(schedule);
    closeTopbarMenu();
    render();
    showToast("背景已清除");
  }

  function updateBackgroundOpacity() {
    const schedule = currentSchedule();
    schedule.backgroundOpacity = clamp(Number(elements.backgroundOpacityInput?.value) || 70, 20, 100);
    saveState();
    applyScheduleBackground(schedule);
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

  function traceRoundRect(ctx, x, y, width, height, radius) {
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
  }

  function roundRect(ctx, x, y, width, height, radius, fillStyle) {
    traceRoundRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
    traceRoundRect(ctx, x, y, width, height, radius);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
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
  window.visualViewport?.addEventListener("resize", () => {
    updateModalViewportVars();
    positionTopbarMenu();
  });
  window.visualViewport?.addEventListener("scroll", () => {
    updateModalViewportVars();
    positionTopbarMenu();
  });
  window.addEventListener("resize", () => {
    updateModalViewportVars();
    positionTopbarMenu();
  });

  elements.openAccountBtn?.addEventListener("click", () => openSignInPanel(signInAccountLoggedIn ? "signin" : "account"));
  elements.syncSklScheduleBtn?.addEventListener("click", syncSklSchedule);
  elements.closeSignInBtn?.addEventListener("click", closeSignInPanel);
  elements.signinBackdrop?.addEventListener("click", closeSignInPanel);
  elements.signInAccountLoginBtn?.addEventListener("click", loginSignInAccount);
  elements.signInSubmitBtn?.addEventListener("click", submitSignInCode);
  elements.signInKeypad?.addEventListener("click", handleSignInKeypadClick);
  elements.signinPanel?.addEventListener("keydown", handleSignInPanelKeydown);
  elements.openSettingsBtn?.addEventListener("click", openSettingsDialog);
  elements.exportImageBtn?.addEventListener("click", exportScheduleImage);
  elements.openBackgroundBtn?.addEventListener("click", openBackgroundPanel);
  elements.closeBackgroundBtn?.addEventListener("click", closeBackgroundPanel);
  elements.backgroundBackdrop?.addEventListener("click", closeBackgroundPanel);
  elements.backgroundOpacityInput?.addEventListener("input", updateBackgroundOpacity);
  elements.backgroundInput?.addEventListener("change", handleBackgroundInputChange);
  elements.clearBackgroundBtn?.addEventListener("click", clearBackgroundImage);
  elements.backgroundCropScaleInput?.addEventListener("input", updateBackgroundCropScale);
  elements.backgroundCropStage?.addEventListener("pointerdown", handleBackgroundCropPointerDown);
  elements.backgroundCropStage?.addEventListener("pointermove", handleBackgroundCropPointerMove);
  elements.backgroundCropStage?.addEventListener("pointerup", handleBackgroundCropPointerUp);
  elements.backgroundCropStage?.addEventListener("pointercancel", handleBackgroundCropPointerUp);
  elements.newScheduleBtn.addEventListener("click", createNewSchedule);
  elements.saveSettingsBtn.addEventListener("click", saveSettingsFromDialog);
  elements.deleteScheduleBtn.addEventListener("click", deleteCurrentSchedule);
  elements.sheetBackdrop.addEventListener("click", hideCourseDetail);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideCourseDetail();
  });


  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js?v=fakeup-pwa-38").catch(() => {});
    });
  }

  checkSignInAccountStatus({ quiet: true });
  registerServiceWorker();
  render();
})();
