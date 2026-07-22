import { isPassed, isUnlockedIn, recordResult, type LearnProgress } from '@/features/learn/progress';
import { COURSE_META, loadCourse, loadCourseLessons } from './courses';

// Regressionstest für den User-Fund "Tajwid ist noch gesperrt, ich kann es
// erst starten, wenn ich Wortschatz etc. abgeschlossen habe, obwohl die
// Reihenfolge für mich evtl. keinen Sinn ergibt": app/learn/index.tsx
// verkettete früher Tajwid -> Grammatik -> Madinah-Arabisch (und alle drei
// hinter dem vollständigen Kern-Lesen-Pfad inkl. Koran-Wortschatz) über ein
// zusätzliches `phaseLocked`-Flag, das UNABHÄNGIG von der eigentlichen,
// korrekt kurs-scoped isUnlockedIn-Prüfung war. Diese Kette wurde entfernt —
// die einzige verbleibende Unlock-Quelle je Kurs ist
// isUnlockedIn(course.lessons, ownProgress, lessonId), die per Definition
// nur vom EIGENEN Storage-Key abhängt und keinen Zugriff auf andere Kurse
// oder den Kern-Lesen-Pfad hat.
describe('Kurs-Unlock ist themenscoped, nicht global-sequenziell', () => {
  const crossCourseIds = ['tajwid', 'grammar', 'madinah'];

  it('erste Lektion von Tajwid/Grammatik/Madinah-Arabisch ist ohne jeden eigenen Fortschritt sofort startbar', async () => {
    for (const id of crossCourseIds) {
      const course = (await loadCourse(id))!;
      expect(course.lessons.length).toBeGreaterThan(0);
      expect(isUnlockedIn(course.lessons, {}, course.lessons[0].id)).toBe(true);
    }
  });

  it('Startbarkeit von Tajwid/Grammatik/Madinah-Arabisch hängt nie vom Fortschritt eines ANDEREN Kurses ab', async () => {
    // isUnlockedIn nimmt bewusst nur die Lektionen + den Fortschritt EINES
    // Kurses entgegen - es existiert keine Möglichkeit, "vollständig
    // unbearbeiteter Wortschatz/Kern-Lesen-Pfad" als Sperrgrund für einen
    // anderen Kurs hineinzureichen. Diese leere Ausgangslage simuliert
    // exakt den User-Fund: kein einziger Kern-Lesen/Wortschatz-Fortschritt
    // vorhanden, trotzdem muss Tajwid Lektion 1 startbar sein.
    const noProgress: LearnProgress = {};
    for (const id of crossCourseIds) {
      const course = (await loadCourse(id))!;
      expect(isUnlockedIn(course.lessons, noProgress, course.lessons[0].id)).toBe(true);
    }
  });

  it('innerhalb eines Kurses bleibt die echte Lektion-für-Lektion-Progression bestehen', async () => {
    for (const id of crossCourseIds) {
      const course = (await loadCourse(id))!;
      if (course.lessons.length < 2) continue;
      const secondLessonId = course.lessons[1].id;
      expect(isUnlockedIn(course.lessons, {}, secondLessonId)).toBe(false);
      const passed = recordResult({}, course.lessons[0].id, 8, 8);
      expect(isPassed(passed, course.lessons[0].id)).toBe(true);
      expect(isUnlockedIn(course.lessons, passed, secondLessonId)).toBe(true);
    }
  });

  it('Course-Datenmodell kennt kein kurs-übergreifendes Sperr-Feld', () => {
    for (const course of COURSE_META) {
      expect(course).not.toHaveProperty('phaseLocked');
      expect(course).not.toHaveProperty('requiresCourseId');
    }
  });
});

// COURSE_DEFS.lessonCount (courses.ts) ist per Design hart hinterlegt, damit
// COURSE_META synchron ohne die schweren Kurs-JSONs verfügbar ist (siehe
// Kommentar dort). Dieser Test ist die Absicherung dagegen, dass diese Zahl
// bei einer künftigen Content-Änderung (Lektion hinzugefügt/entfernt)
// stillschweigend veraltet — er lädt jedes Kurs-JSON tatsächlich und
// vergleicht die reale Lektionsanzahl mit dem hinterlegten lessonCount.
describe('COURSE_META.lessonCount bleibt synchron mit den echten Kurs-JSONs', () => {
  it.each(COURSE_META.map((c) => c.id))('%s: lessonCount stimmt mit der geladenen Lektionsanzahl überein', async (id) => {
    const meta = COURSE_META.find((c) => c.id === id)!;
    const lessons = await loadCourseLessons(id);
    expect(lessons.length).toBe(meta.lessonCount);
  });
});
