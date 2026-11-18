import { useEffect, useMemo } from "react";
import { useResource, useResources } from "@/shared/api/resource/index.ts";
import { store, useAppSelector } from "@/app/store";
import { useAuth } from "@/features/auth/useAuth";
import { getCourseStudents, getCourses, getUserEnrollments } from "@/features/courses/courseApi";
import { scheduleText as courseScheduleText } from "@/features/courses/scheduleUi";
import type { Course, CourseStudent } from "@/features/courses/types";
import { getTeacherByUserId } from "@/features/teachers/teachersApi";
import { getStoredEvents } from "@/features/schedule/scheduleStore";
import type { ScheduleEvent } from "@/features/schedule/types";
import { nowDate } from "@/shared/utils/now";
import { classesActions as cl, selectClasses } from "./slice";
import type { ClassDoc, ClassDraft, ClassItem, ClassSession, ClassStatus, ClassStudent, DocDraft, SessionDraft } from "./types";
import { addDays, attendanceOf, fmtDM, periodRange, periodsOf, scheduleText, toMin, weekdayIndex } from "./utils";

/*
 * Public API of the class state (a Redux slice in `slice.ts`; see there for where class data comes from).
 * This file converts API courses to `ClassItem`s, creates ids, and dispatches. Everything starts empty.
 */
const { dispatch } = store;
let seq = 0;
const nid = (p: string) => `${p}${Date.now().toString(36)}${++seq}`;

/* ---------- API -> ClassItem ---------- */
const STATUS: Record<Course["status"], ClassStatus> = { OPEN: "OPEN", ACTIVE: "ACTIVE", CLOSE: "CLOSED" };

/** Dated sessions of a course's weekly pattern between its start and end dates (backend days: 1 = Monday). */
function deriveSessions(c: Course): ClassSession[] {
  if (!c.daysOfWeek?.length || !c.startTime || !c.endTime || !c.startDate || !c.endDate) return [];
  const p = periodsOf(c.startTime, c.endTime);
  const out: ClassSession[] = [];
  for (let d = c.startDate, no = 1; d <= c.endDate && no <= 400; d = addDays(d, 1)) {
    if (!c.daysOfWeek.includes(weekdayIndex(d) + 1)) continue;
    out.push({
      id: `${c.id}@${d}`,
      date: d,
      startPeriod: p.startPeriod,
      periods: p.periods,
      start: c.startTime,
      end: c.endTime,
      room: c.room ?? "",
      topic: `Buổi ${no}`,
      no,
      docIds: [],
    });
    no++;
  }
  return out;
}

function fromCourse(c: Course, o: { teacherId: string; students: ClassStudent[] }): ClassItem {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    teacherId: o.teacherId,
    teacherName: c.teacher?.fullName,
    room: c.room ?? "",
    scheduleText: courseScheduleText(c) || "Chưa có lịch",
    startDate: c.startDate,
    endDate: c.endDate,
    status: STATUS[c.status] ?? "OPEN",
    category: c.categoryId ?? "",
    capacity: c.maxStudent,
    enrolled: c.enrolledCount ?? o.students.length,
    students: o.students,
    docs: [],
    sessions: deriveSessions(c),
  };
}

const toStudent = (s: CourseStudent): ClassStudent => ({
  id: s.userId,
  name: s.fullName || s.username,
  email: s.email ?? "",
  phone: s.phone ?? "",
  att: null,
  fc: null,
  rush: null,
  last: "—",
  joined: s.enrollDate ?? undefined,
});

/** Fetches the signed-in user's classes and feeds the store. Safe to call from every consumer (queries are shared). */
function useApiClasses() {
  const { user, isTeacher } = useAuth();
  const isStudent = !!user && !isTeacher && user.roles.includes("STUDENT");
  const userId = user?.id ?? "";

  const teacherQ = useResource({
    queryKey: ["classes", "teacher-profile", userId],
    queryFn: () => getTeacherByUserId(userId).then((r) => r.data),
    enabled: !!userId && isTeacher,
  });
  const coursesQ = useResource({
    queryKey: ["classes", "courses"],
    queryFn: () => getCourses().then((r) => r.data ?? []),
    enabled: !!userId && isTeacher,
  });
  const enrollQ = useResource({
    queryKey: ["classes", "enrollments", userId],
    queryFn: () => getUserEnrollments(userId),
    enabled: !!userId && isStudent,
  });

  const mine = useMemo(() => {
    if (isTeacher) {
      const tid = teacherQ.data?.id;
      return tid ? (coursesQ.data ?? []).filter((c) => c.teacher?.id === tid) : [];
    }
    if (isStudent) return (enrollQ.data ?? []).filter((e) => e.enrollmentStatus === "ACTIVE").map((e) => e.course);
    return [];
  }, [isTeacher, isStudent, teacherQ.data, coursesQ.data, enrollQ.data]);

  const studentQs = useResources(
    mine.map((c) => ({
      queryKey: ["classes", "students", c.id],
      queryFn: () => getCourseStudents(c.id),
      enabled: isTeacher,
    })),
  );

  const items = useMemo(
    () =>
      mine.map((c, i) =>
        fromCourse(c, {
          teacherId: isTeacher ? userId : (c.teacher?.id ?? ""),
          students: (studentQs[i]?.data ?? []).map(toStudent),
        }),
      ),
    [mine, isTeacher, userId, studentQs],
  );

  useEffect(() => {
    dispatch(cl.apiClassesSet(items));
  }, [items]);
}

/** The signed-in user's own classes: a teacher's courses (+ classes created here) or a student's enrolled courses. */
export function useClasses(): ClassItem[] {
  useApiClasses();
  return useAppSelector(selectClasses);
}

export function useClass(id: string | undefined): ClassItem | undefined {
  return useClasses().find((c) => c.id === id);
}

export const getClasses = () => selectClasses(store.getState());

/** Calendar events of every class session (kind "class"). Class sessions are the single source of the class calendar. */
export function classEvents(classes: ClassItem[]): ScheduleEvent[] {
  return classes.flatMap((c) =>
    c.sessions.map((s) => ({
      id: `ev-${s.id}`,
      date: s.date,
      start: s.start,
      end: s.end,
      title: c.name,
      category: c.category,
      kind: "class" as const,
      meta: `${s.room || "Chưa có phòng"} · Buổi ${s.no}`,
      link: s.link,
      teacherId: c.teacherId,
      classId: c.id,
      sessionId: s.id,
      owner: "staff" as const,
    })),
  );
}

/* ---------- conflicts ---------- */
export type Slot = { date: string; start: string; end: string };

/** Teacher events (class sessions + own blocks) that overlap any of the slots (titles, de-duplicated). */
export function findConflicts(teacherId: string, slots: Slot[], ignoreSessionId?: string): string[] {
  const mine = [...classEvents(getClasses()), ...getStoredEvents()].filter((e) => e.owner === "staff" && e.teacherId === teacherId && e.sessionId !== ignoreSessionId);
  const out = new Set<string>();
  slots.forEach((s) => {
    mine.forEach((e) => {
      if (e.date === s.date && toMin(e.start) < toMin(s.end) && toMin(s.start) < toMin(e.end)) out.add(`${e.title} · ${fmtDM(e.date)} ${e.start}–${e.end}`);
    });
  });
  return [...out];
}

/** Dates of the sessions a new class would get: `weeks` x number of weekdays, starting at startDate. */
export function planSessionDates(startDate: string, days: number[], weeks: number): string[] {
  const total = weeks * days.length;
  const out: string[] = [];
  for (let i = 0; out.length < total && i < weeks * 7 + 7; i++) {
    const d = addDays(startDate, i);
    if (days.includes(weekdayIndex(d))) out.push(d);
  }
  return out;
}

/* ---------- classes ---------- */
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .slice(0, 8);

/** Short unique class code derived from the name (e.g. "IELTS 6.0 Starter" -> IELTS60S). */
export function makeClassCode(name: string): string {
  const base = slug(name) || "LOP";
  let code = base;
  for (let i = 2; getClasses().some((c) => c.code === code); i++) code = `${base}${i}`;
  return code;
}

/** Creates a class that exists only in this browser (the API lets only admins create courses). */
export function createClass(draft: ClassDraft, owner: { id: string; name: string }): string {
  const id = nid("local-");
  const r = periodRange(draft.startPeriod, draft.periods);
  const dates = planSessionDates(draft.startDate, draft.days, draft.weeks);
  const sessions: ClassSession[] = dates.map((date, i) => ({
    id: nid("ses"),
    date,
    startPeriod: draft.startPeriod,
    periods: draft.periods,
    start: r.start,
    end: r.end,
    room: draft.room,
    topic: `Buổi ${i + 1}`,
    no: i + 1,
    docIds: [],
    link: draft.link.trim() || undefined,
  }));
  const cls: ClassItem = {
    id,
    name: draft.name.trim(),
    code: makeClassCode(draft.name),
    teacherId: owner.id,
    teacherName: owner.name,
    local: true,
    room: draft.room,
    scheduleText: scheduleText(draft.days, draft.startPeriod, draft.periods),
    startDate: draft.startDate,
    endDate: dates[dates.length - 1] ?? draft.startDate,
    status: "OPEN",
    category: draft.category,
    capacity: 15,
    enrolled: 0,
    students: [],
    docs: [],
    sessions,
  };
  dispatch(cl.classCreated(cls));
  return id;
}

/* ---------- sessions ---------- */
export function addSession(classId: string, draft: SessionDraft) {
  const r = periodRange(draft.startPeriod, draft.periods);
  const session: Omit<ClassSession, "no"> = {
    id: nid("ses"),
    date: draft.date,
    startPeriod: draft.startPeriod,
    periods: draft.periods,
    start: r.start,
    end: r.end,
    room: draft.room,
    topic: draft.topic.trim(),
    docIds: draft.docIds,
    link: draft.link.trim() || undefined,
  };
  dispatch(cl.sessionAdded({ classId, session }));
}

/** Copy one session of a class onto another date (used by "Sao chép từ tuần trước"). */
export function copySession(classId: string, sessionId: string, date: string): boolean {
  const src = getClasses().find((x) => x.id === classId)?.sessions.find((s) => s.id === sessionId);
  if (!src) return false;
  dispatch(cl.sessionCopied({ classId, sessionId, date, id: nid("ses") }));
  return true;
}

export const removeSession = (classId: string, sessionId: string) => dispatch(cl.sessionRemoved({ classId, sessionId }));

export const updateSessionTopic = (classId: string, sessionId: string, topic: string) => dispatch(cl.topicUpdated({ classId, sessionId, topic }));

export const setAttendance = (classId: string, sessionId: string, studentId: string, present: boolean) =>
  dispatch(cl.attendanceSet({ classId, sessionId, studentId, present }));

export const addHomework = (classId: string, sessionId: string, hw: { kind: "deck" | "set"; id: string }) => dispatch(cl.homeworkAdded({ classId, sessionId, hw }));

export const removeHomework = (classId: string, sessionId: string, hw: { kind: "deck" | "set"; id: string }) =>
  dispatch(cl.homeworkRemoved({ classId, sessionId, hw }));

/* ---------- documents ---------- */
export const attachDoc = (classId: string, sessionId: string, docId: string) => dispatch(cl.docAttached({ classId, sessionId, docId }));

export const detachDoc = (classId: string, sessionId: string, docId: string) => dispatch(cl.docDetached({ classId, sessionId, docId }));

export function addDoc(classId: string, draft: DocDraft, author: string) {
  const doc: ClassDoc = {
    id: nid("d"),
    name: draft.name.trim(),
    type: draft.type,
    size: draft.type === "LINK" ? "—" : draft.size,
    url: draft.type === "LINK" ? draft.link.trim() : "",
    by: author,
    date: fmtDM(nowDate()),
    note: draft.note.trim(),
  };
  dispatch(cl.docAdded({ classId, doc }));
}

export const removeDoc = (classId: string, docId: string) => dispatch(cl.docRemoved({ classId, docId }));

/* ---------- derived numbers ---------- */
/** Class attendance computed from the rolls the teacher marked; null when nothing was marked yet. */
export function classAttendance(c: ClassItem): number | null {
  const pcts = c.students.map((s) => attendanceOf(c, s).pct).filter((p): p is number => p !== null);
  if (!pcts.length) return null;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}
