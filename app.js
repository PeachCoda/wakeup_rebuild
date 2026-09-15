(function () {
  "use strict";

  const storageKey = "clean-schedule-state-v2";
  const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const termWeeks = 17;
  const palette = ["#1aa6a6", "#258bd2", "#d48a35", "#7c58d9", "#e86852", "#2fa56f", "#c15ba5", "#5b8def", "#c47f2c", "#15a3c7", "#df5f8f", "#6d8f28"];
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
    headerShowOtherWeek: document.querySelector("#headerShowOtherWeek"),
    openSettingsBtn: document.querySelector("#openSettingsBtn"),
    openImportBtn: document.querySelector("#openImportBtn"),
    newScheduleBtn: document.querySelector("#newScheduleBtn"),
    settingsDialog: document.querySelector("#settingsDialog"),
    settingName: document.querySelector("#settingName"),
    settingStartDate: document.querySelector("#settingStartDate"),
    settingCellHeight: document.querySelector("#settingCellHeight"),
    saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
    deleteScheduleBtn: document.querySelector("#deleteScheduleBtn"),
    importDialog: document.querySelector("#importDialog"),
    importText: document.querySelector("#importText"),
    exportBtn: document.querySelector("#exportBtn"),
    importBtn: document.querySelector("#importBtn"),
    copyHduCollectorBtn: document.querySelector("#copyHduCollectorBtn"),
    importHduBtn: document.querySelector("#importHduBtn"),
    sheetBackdrop: document.querySelector("#sheetBackdrop"),
    courseSheet: document.querySelector("#courseSheet"),
    courseDetail: document.querySelector("#courseDetail"),
    toast: document.querySelector("#toast")
  };

  let state = loadState();

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
          cellHeight: 92,
          showWeekend: false,
          showOtherWeek: true,
          showTime: true,
          timeTable: cloneDefaultTimeTable(13),
          courses: [
            {
              id: uid(),
              name: "人工智能导论",
              color: "#45c7bc",
              credit: "",
              day: 1,
              start: 1,
              end: 2,
              weeks: range(1, 16),
              room: "第7教研楼北220A",
              teacher: "苏方方",
              note: ""
            },
            {
              id: uid(),
              name: "大学物理B2",
              color: "#48bce2",
              credit: "",
              day: 1,
              start: 3,
              end: 5,
              weeks: range(1, 16),
              room: "第6教研楼北410",
              teacher: "乔丽颜",
              note: ""
            },
            {
              id: uid(),
              name: "信号与系统",
              color: "#aeb3bb",
              credit: "",
              day: 1,
              start: 6,
              end: 7,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "第6教研楼北310",
              teacher: "汪云路",
              note: ""
            },
            {
              id: uid(),
              name: "大学军事",
              color: "#aeb3bb",
              credit: "2",
              day: 1,
              start: 10,
              end: 12,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "课外实践 不在教室",
              teacher: "吴周礼",
              note: ""
            },
            {
              id: uid(),
              name: "毛泽东思想和中国特色社会主义理论体系概论",
              color: "#45c7bc",
              credit: "",
              day: 2,
              start: 3,
              end: 5,
              weeks: range(1, 16),
              room: "第7教研楼北308",
              teacher: "李星乔",
              note: ""
            },
            {
              id: uid(),
              name: "计算机系统及安全2（乙）",
              color: "#8d61ee",
              credit: "",
              day: 2,
              start: 6,
              end: 8,
              weeks: range(1, 16),
              room: "第7教研楼北320A",
              teacher: "沈张一",
              note: ""
            },
            {
              id: uid(),
              name: "信号与系统课程实践",
              color: "#aeb3bb",
              credit: "",
              day: 2,
              start: 10,
              end: 12,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "第4教研楼311-313",
              teacher: "汪云路",
              note: ""
            },
            {
              id: uid(),
              name: "信息安全数学基础",
              color: "#48bce2",
              credit: "",
              day: 3,
              start: 1,
              end: 2,
              weeks: range(1, 16),
              room: "第7教研楼北222A",
              teacher: "胡耿然",
              note: ""
            },
            {
              id: uid(),
              name: "数据结构",
              color: "#ff7f63",
              credit: "",
              day: 3,
              start: 3,
              end: 5,
              weeks: range(1, 16),
              room: "第6教研楼中117",
              teacher: "沈张一",
              note: ""
            },
            {
              id: uid(),
              name: "形势与政策3",
              color: "#aeb3bb",
              credit: "",
              day: 3,
              start: 6,
              end: 7,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "第6教研楼北306",
              teacher: "周艺蕾",
              note: ""
            },
            {
              id: uid(),
              name: "创新创业法律风险防范",
              color: "#48bce2",
              credit: "",
              day: 3,
              start: 10,
              end: 11,
              weeks: range(1, 16),
              room: "第7教研楼北408",
              teacher: "朱金艺",
              note: ""
            },
            {
              id: uid(),
              name: "体育-无线电测向(男)",
              color: "#d69a54",
              credit: "",
              day: 4,
              start: 1,
              end: 2,
              weeks: range(1, 16),
              room: "东边田径场",
              teacher: "朱玲",
              note: ""
            },
            {
              id: uid(),
              name: "数据结构课程实践",
              color: "#aeb3bb",
              credit: "",
              day: 4,
              start: 3,
              end: 5,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "第4教研楼409",
              teacher: "沈张一",
              note: ""
            },
            {
              id: uid(),
              name: "计算机系统及安全课程实践2（乙）",
              color: "#aeb3bb",
              credit: "",
              day: 4,
              start: 6,
              end: 8,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "第4教研楼431",
              teacher: "沈张一",
              note: ""
            },
            {
              id: uid(),
              name: "科技发展简史",
              color: "#d69a54",
              credit: "",
              day: 4,
              start: 10,
              end: 11,
              weeks: range(1, 16),
              room: "第6教研楼北204",
              teacher: "于翠萍",
              note: ""
            },
            {
              id: uid(),
              name: "信号与系统",
              color: "#aeb3bb",
              credit: "",
              day: 5,
              start: 1,
              end: 2,
              weeks: range(2, 18).filter((week) => week % 2 === 0),
              room: "第6教研楼北310",
              teacher: "汪云路",
              note: ""
            },
            {
              id: uid(),
              name: "概率论与数理统计",
              color: "#d69a54",
              credit: "",
              day: 5,
              start: 3,
              end: 5,
              weeks: range(1, 16),
              room: "第6教研楼北310",
              teacher: "石曙菁",
              note: ""
            },
            {
              id: uid(),
              name: "跨文化交际",
              color: "#45c7bc",
              credit: "",
              day: 5,
              start: 6,
              end: 7,
              weeks: range(1, 16),
              room: "第3教研楼南楼121西",
              teacher: "胡婷婷",
              note: ""
            }
          ]
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
        cellHeight: clamp(Number(schedule.cellHeight) || 92, 72, 132),
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
      color: repairedCourse.color || palette[0],
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
    if (elements.headerShowOtherWeek) elements.headerShowOtherWeek.checked = schedule.showOtherWeek;
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
      cell.innerHTML = `<strong>${dayNames[day - 1]}</strong><span>${date.getDate()}</span>`;
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
        ? `<strong>${node}</strong><span>${time[0]}</span><span>${time[1]}</span>`
        : `<strong>${node}</strong>`;
      elements.timetable.append(timeCell);

      days.forEach((day) => {
        const cell = document.createElement("div");
        cell.className = `grid-cell${day >= 6 ? " weekend" : ""}`;
        cell.setAttribute("aria-label", `${dayNames[day - 1]} 第 ${node} 节`);
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
      empty.innerHTML = "<div><strong>还没有课程</strong><br>请通过导入导出添加课表数据</div>";
      elements.timetable.append(empty);
      return;
    }

    const gap = 3;
    const placedItems = layoutCourseItems(visibleItems);
    placedItems.forEach((item) => {
      const dayIndex = days.indexOf(item.day);
      if (dayIndex < 0) return;
      const card = document.createElement("button");
      const conflict = item.laneCount > 1;
      card.className = `course-card${item.isActive ? "" : " other-week"}${conflict ? " conflict" : ""}${item.laneCount > 1 ? " compact" : ""}`;
      card.type = "button";
      card.style.setProperty("--course-color", item.course.color);
      card.style.setProperty("--course-bg", tintColor(item.course.color, item.isActive ? 0.84 : 0.9));
      card.style.setProperty("--course-text", shadeColor(item.course.color, item.isActive ? 0.28 : 0.48));
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
            <span>${escapeHtml(schedule.name || "我的课表")}</span>
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
        <div class="detail-row"><span>时间</span><strong>${escapeHtml(dayNames[(session.day || course.day) - 1])} · ${escapeHtml(sessionTimeText(schedule, session))}</strong></div>
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
    schedule.cellHeight = clamp(Number(elements.settingCellHeight.value) || 92, 72, 132);
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


  function importHduData() {
    const raw = elements.importText.value.trim();
    if (!raw) {
      showToast("请先粘贴杭电教务课表内容");
      return;
    }
    if (isHduScheduleUrl(raw)) {
      showToast("这是课表网址，请先运行采集脚本生成 FakeUp 课表 JSON");
      return;
    }
    const parsed = parseHduSchedule(raw);
    if (!parsed.length) {
      showToast("没有识别到课程，请粘贴采集脚本生成的 FakeUp 课表 JSON");
      return;
    }
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
    elements.importDialog.close();
    render();
    showToast(`已导入 ${schedule.courses.length} 门课程`);
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
  function copyHduCollectorScript() {
    const script = `(() => {
  const outputVersion = 2;

  function cleanup(value) {
    return String(value || "")
      .replace(/&nbsp;/g, " ")
      .replace(/[\\t\\r]+/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function compact(value) {
    return cleanup(value).replace(/\\s+/g, "");
  }

  function first(record, keys) {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && cleanup(value) && cleanup(value) !== "undefined") return cleanup(value);
    }
    const entries = Object.entries(record);
    for (const key of keys) {
      const lower = key.toLowerCase();
      const found = entries.find(([name, value]) => name.toLowerCase().includes(lower) && cleanup(value) && cleanup(value) !== "undefined");
      if (found) return cleanup(found[1]);
    }
    return "";
  }

  function range(start, end) {
    const a = Math.min(Number(start), Number(end));
    const b = Math.max(Number(start), Number(end));
    return Array.from({ length: b - a + 1 }, (_, index) => a + index).filter((item) => item >= 1 && item <= 17);
  }

  function uniqueNumbers(values) {
    return Array.from(new Set(values.map(Number).filter(Number.isFinite))).sort((a, b) => a - b);
  }

  function weeksFromText(text) {
    const source = cleanup(text);
    let weeks = [];
    let match;
    const rangePattern = /(\\d{1,2})\\s*(?:-|~|到|至)\\s*(\\d{1,2})\\s*周?/g;
    while ((match = rangePattern.exec(source))) weeks.push(...range(match[1], match[2]));
    if (!weeks.length) {
      const listMatch = source.match(/((?:\\d{1,2}\\s*[,，、]\\s*)+\\d{1,2})\\s*周/);
      if (listMatch) weeks = listMatch[1].split(/[,，、]/).map(Number);
    }
    if (!weeks.length) return [];
    if (/单周|\\(单\\)|（单）/.test(source)) weeks = weeks.filter((week) => week % 2 === 1);
    if (/双周|\\(双\\)|（双）/.test(source)) weeks = weeks.filter((week) => week % 2 === 0);
    return uniqueNumbers(weeks).filter((week) => week >= 1 && week <= 17);
  }

  function sectionFromText(text) {
    const source = cleanup(text);
    const rangeMatch = source.match(/(?:第\\s*)?(1[0-3]|[1-9])\\s*(?:-|~|到|至)\\s*(1[0-3]|[1-9])\\s*节/);
    if (rangeMatch) return { start: Number(rangeMatch[1]), end: Number(rangeMatch[2]) };
    const singleMatch = source.match(/(?:第\\s*)?(1[0-3]|[1-9])\\s*节/);
    if (singleMatch) return { start: Number(singleMatch[1]), end: Number(singleMatch[1]) };
    return null;
  }

  function dayFromText(text) {
    const source = cleanup(text);
    if (/星期一|周一/.test(source)) return 1;
    if (/星期二|周二/.test(source)) return 2;
    if (/星期三|周三/.test(source)) return 3;
    if (/星期四|周四/.test(source)) return 4;
    if (/星期五|周五/.test(source)) return 5;
    return 0;
  }

  function creditFromRecord(record) {
    const direct = first(record, ["xf", "xfs", "credit", "credits", "xfmc", "学分"]);
    const match = direct.match(/\\d+(?:\\.\\d+)?/);
    if (match && Number(match[0]) > 0 && Number(match[0]) <= 10) return String(Number(match[0])).replace(/\\.0$/, "");
    for (const [key, value] of Object.entries(record)) {
      if (/(?:^|[_.-])(?:xf|credit|credits)(?:$|[_.-])|学分/i.test(key)) {
        const found = cleanup(value).match(/\\d+(?:\\.\\d+)?/);
        if (found && Number(found[0]) > 0 && Number(found[0]) <= 10) return String(Number(found[0])).replace(/\\.0$/, "");
      }
    }
    return "";
  }

  function recordToCourse(record) {
    const name = compact(first(record, ["kcmc", "kcm", "kcmcText", "courseName", "course", "name"]));
    if (!name || /红色斜体|蓝色为已选|请选择记录/.test(name)) return null;
    const rawDay = Number(first(record, ["xqj", "xq", "weekDay", "day", "xq"].filter(Boolean)));
    const day = rawDay || dayFromText(first(record, ["xqjmc", "sksj", "sksjText", "time"]));
    if (!day || day > 5) return null;
    const sectionText = first(record, ["jc", "jcs", "skjc", "jcor", "oldjc", "sksj", "time"]);
    const parsedSection = sectionFromText(sectionText);
    const start = Number(first(record, ["ksjc", "qsz", "qszj", "start", "startNode"])) || parsedSection?.start;
    const end = Number(first(record, ["jsjc", "zzz", "jszj", "end", "endNode"])) || parsedSection?.end;
    if (!start || !end || start > 13) return null;
    const weeks = weeksFromText(first(record, ["zcd", "zcmc", "oldzc", "skzc", "zc", "weeks", "sksj", "time"])) || [];
    return {
      name,
      day,
      start: Math.max(1, Math.min(13, start)),
      end: Math.max(1, Math.min(13, end)),
      weeks: weeks.length ? weeks : range(1, 17),
      teacher: compact(first(record, ["xm", "jsxm", "rkjs", "teacherName", "teacher", "jsmc"])),
      room: compact(first(record, ["cdmc", "jxcdmc", "jxcd", "roomName", "room", "jxdd"])),
      credit: creditFromRecord(record),
      note: ""
    };
  }

  function collectModelRecords(root) {
    const records = new Map();
    function put(index, key, value) {
      if (!records.has(index)) records.set(index, {});
      records.get(index)[key] = value;
    }
    root.querySelectorAll("input[name^='modelList[']").forEach((input) => {
      const match = input.name.match(/^modelList\\[(\\d+)\\]\\.([^\\]]+)$/);
      if (match) put(Number(match[1]), match[2], input.value || "");
    });
    return Array.from(records.values());
  }

  function collectFromWindow(win) {
    const candidates = [];
    try {
      ["modelList", "kbList", "courseList", "kblist"].forEach((key) => {
        if (Array.isArray(win[key])) candidates.push(...win[key]);
      });
    } catch (error) {}
    return candidates.filter((item) => item && typeof item === "object");
  }

  function collectAll(rootWindow) {
    const docs = [];
    function visit(win) {
      try {
        docs.push(win.document);
        Array.from(win.frames || []).forEach(visit);
      } catch (error) {}
    }
    visit(rootWindow);
    const records = [];
    docs.forEach((doc) => records.push(...collectModelRecords(doc)));
    records.push(...collectFromWindow(rootWindow));
    const courses = records.map(recordToCourse).filter(Boolean);
    const seen = new Set();
    return courses.filter((course) => {
      const key = [course.name, course.day, course.start, course.end, course.weeks.join(","), course.teacher, course.room].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const data = JSON.stringify({
    source: "fakeup-hdu-collector",
    version: outputVersion,
    title: document.title,
    url: location.href,
    collectedAt: new Date().toISOString(),
    courses: collectAll(window)
  }, null, 2);

  const oldPanel = document.getElementById("fakeup-hdu-copy-panel");
  if (oldPanel) oldPanel.remove();

  function showManualBox(message) {
    const panel = document.createElement("div");
    panel.id = "fakeup-hdu-copy-panel";
    panel.style.position = "fixed";
    panel.style.inset = "12px";
    panel.style.zIndex = "2147483647";
    panel.style.padding = "12px";
    panel.style.background = "rgba(255,255,255,.98)";
    panel.style.border = "2px solid #1677ff";
    panel.style.boxShadow = "0 12px 40px rgba(0,0,0,.25)";
    panel.style.display = "grid";
    panel.style.gridTemplateRows = "auto 1fr auto";
    panel.style.gap = "8px";
    const tips = document.createElement("div");
    tips.textContent = message || "已生成 FakeUp 课表 JSON。回到 FakeUp 粘贴后点‘导入杭电课表’。";
    tips.style.cssText = "font:14px/1.5 system-ui,sans-serif;color:#111;";
    const box = document.createElement("textarea");
    box.value = data;
    box.style.cssText = "width:100%;height:100%;box-sizing:border-box;font:12px/1.4 ui-monospace,Consolas,monospace;";
    const close = document.createElement("button");
    close.textContent = "关闭";
    close.type = "button";
    close.style.cssText = "justify-self:end;padding:8px 18px;border:0;border-radius:10px;background:#1677ff;color:#fff;font:14px system-ui,sans-serif;";
    close.onclick = () => panel.remove();
    panel.append(tips, box, close);
    document.body.appendChild(panel);
    box.focus();
    box.select();
    try { document.execCommand("copy"); } catch (error) {}
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(data).then(
      () => showManualBox("已复制 FakeUp 课表 JSON。回到 FakeUp 粘贴后点‘导入杭电课表’。"),
      () => showManualBox("浏览器没有允许自动复制。请按 Ctrl+C 复制下面 JSON，再回到 FakeUp 粘贴导入。")
    );
  } else {
    showManualBox("浏览器没有开放剪贴板权限。请按 Ctrl+C 复制下面 JSON，再回到 FakeUp 粘贴导入。")
  }
})();`;
    const copiedMessage = "已复制采集脚本，到教务系统 Console 粘贴运行即可";
    const manualMessage = "复制失败，浏览器没有开放剪贴板权限";
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(script).then(
        () => showToast(copiedMessage),
        () => showToast(manualMessage)
      );
      return;
    }
    showToast(manualMessage);
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
    const match = source.match(/^(.+?)[（(]\s*(?:第\s*)?(?:1[0-3]|[1-9])\s*(?:-|~|到|至)\s*(?:1[0-3]|[1-9])\s*节/);
    if (!match) return "";
    const name = cleanupField(match[1]);
    return isValidCourseNameLine(name) ? name : "";
  }

  function findCourseNameAround(lines, sectionIndex, nextSectionIndex) {
    for (let index = sectionIndex - 1; index >= 0 && index >= sectionIndex - 8; index -= 1) {
      const candidate = cleanupField(lines[index]);
      if (isValidCourseNameLine(candidate)) return candidate;
    }
    for (let index = sectionIndex + 1; index < nextSectionIndex && index <= sectionIndex + 5; index += 1) {
      const candidate = cleanupField(lines[index]);
      if (isValidCourseNameLine(candidate)) return candidate;
    }
    return "";
  }

  function isValidCourseNameLine(value) {
    const source = cleanupImportLine(value);
    const compact = cleanupField(source);
    if (!compact || compact.length < 2 || compact.length > 45) return false;
    if (!/[\u4e00-\u9fff]/.test(compact)) return false;
    if (isLegendText(source) || isHeaderLike(source) || isCourseNoiseLine(source) || isRoomLikeLine(source)) return false;
    if (isTeacherLikeLine(source) && !isShortCourseName(source)) return false;
    if (sectionFromText(source) || /(?:\d{1,2}\s*(?:-|~|到|至)\s*\d{1,2}\s*周|单周|双周)/.test(source)) return false;
    if (/^\(?20\d{2}-20\d{2}-\d\)?/.test(source)) return false;
    if (/^[A-Z]?\d{4,}(?:[-—]\d+)?$/i.test(source)) return false;
    return true;
  }


  function isShortCourseName(value) {
    return /(?:大学军事|军事理论|体育|形势|政策|实践|课程|英语|物理|高数|数学|概率|统计|安全|导论|简史|交际)/.test(cleanupField(value));
  }

  function hasCourseLikeSignal(value) {
    const source = cleanCourseText(value);
    return /(?:\d{1,2}\s*(?:-|~|到|至)\s*\d{1,2}\s*周|单周|双周|\d{1,2}\s*节|教研楼|教学楼|教室|实验室|机房|田径场|体育馆|不在教室)/.test(source)
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
    const rangeMatch = source.match(/(?:第\s*)?(1[0-3]|[1-9])\s*(?:-|~|到|至)\s*(1[0-3]|[1-9])\s*节/);
    if (rangeMatch) return { start: Number(rangeMatch[1]), end: Number(rangeMatch[2]) };
    const singleMatch = source.match(/(?:第\s*)?(1[0-3]|[1-9])\s*节/);
    if (singleMatch) return { start: Number(singleMatch[1]), end: Number(singleMatch[1]) };
    return null;
  }

  function weeksFromText(text) {
    const source = cleanCourseText(text);
    const maxWeek = termWeeks;
    let weeks = [];
    const rangePattern = /(\d{1,2})\s*(?:-|~|到|至)\s*(\d{1,2})\s*周?/g;
    let match;
    while ((match = rangePattern.exec(source))) {
      weeks.push(...range(Number(match[1]), Number(match[2])));
    }
    if (!weeks.length) {
      const listMatch = source.match(/((?:\d{1,2}\s*[,，、]\s*)+\d{1,2})\s*周/);
      if (listMatch) weeks = listMatch[1].split(/[,，、]/).map(Number);
    }
    if (!weeks.length) return null;
    if (/单周|\(单\)|（单）/.test(source)) weeks = weeks.filter((week) => week % 2 === 1);
    if (/双周|\(双\)|（双）/.test(source)) weeks = weeks.filter((week) => week % 2 === 0);
    return uniqueNumbers(weeks).filter((week) => week >= 1 && week <= maxWeek);
  }


  function detectCredit(value) {
    const source = cleanCourseText(value);
    const labeled = source.match(/(?:学分|credit|xf)\s*[:：]?\s*(\d+(?:\.\d+)?)/i);
    if (labeled) return formatCredit(labeled[1]);
    const directSource = source.trim();
    if (/^\d+(?:\.\d+)?$/.test(directSource)) {
      const direct = Number(directSource);
      if (direct > 0 && direct <= 10) return formatCredit(directSource);
    }
    const lines = source.split(/\n+/).map((line) => cleanupImportLine(line)).filter(Boolean);
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
    const labeled = cleanCourseText(text).match(/(?:教师|老师|任课教师)[:：]?\s*([^\n\s,，；;]+)/);
    if (labeled) return cleanupField(labeled[1]);
    const candidate = lines.find((line) => /^[\u4e00-\u9fa5]{2,4}$/.test(line) && !/(教|楼|室|场|馆|周|节)$/.test(line));
    return cleanupField(candidate || "");
  }

  function detectRoom(lines, text) {
    const labeled = cleanCourseText(text).match(/(?:地点|教室|上课地点)[:：]?\s*([^\n]+)/);
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
  function exportData() {
    elements.importText.value = JSON.stringify(state, null, 2);
    elements.importText.select();
    navigator.clipboard?.writeText(elements.importText.value).then(
      () => showToast("已导出并复制到剪贴板"),
      () => showToast("已导出，请手动复制")
    );
  }

  function importData() {
    try {
      const next = normalizeState(JSON.parse(elements.importText.value));
      state = next;
      saveState();
      elements.importDialog.close();
      render();
      showToast("导入成功");
    } catch (error) {
      showToast("导入失败，请检查 JSON 格式");
    }
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
    render();
  });
  elements.weekPickerBtn?.addEventListener("click", openWeekPicker);
  elements.weekSelect?.addEventListener("change", () => {
    state.selectedWeek = clamp(Number(elements.weekSelect.value) || 1, 1, currentSchedule().totalWeeks);
    saveState();
    render();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeWeekPicker();
  });
  elements.headerShowOtherWeek.addEventListener("change", () => {
    const schedule = currentSchedule();
    schedule.showOtherWeek = elements.headerShowOtherWeek.checked;
    saveState();
    render();
  });

  elements.openSettingsBtn?.addEventListener("click", openSettingsDialog);
  elements.openImportBtn.addEventListener("click", () => elements.importDialog.showModal());
  elements.newScheduleBtn.addEventListener("click", createNewSchedule);
  elements.saveSettingsBtn.addEventListener("click", saveSettingsFromDialog);
  elements.deleteScheduleBtn.addEventListener("click", deleteCurrentSchedule);
  elements.exportBtn.addEventListener("click", exportData);
  elements.importBtn.addEventListener("click", importData);
  elements.copyHduCollectorBtn?.addEventListener("click", copyHduCollectorScript);
  elements.importHduBtn?.addEventListener("click", importHduData);
  elements.sheetBackdrop.addEventListener("click", hideCourseDetail);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideCourseDetail();
  });

  render();
})();

