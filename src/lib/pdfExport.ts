import jsPDF from "jspdf";

export interface PdfQuizQuestion {
  question:     string;
  options?:     string[];
  answer:       string;       // letter "A"/"B"/etc. for MC, full text for open
  explanation?: string;
}

export interface QuizExportOptions {
  title:           string;
  topic:           string;
  grade:           string;
  questions:       PdfQuizQuestion[];
  includeAnswers:  boolean;
  lang?:           "es" | "en";
}

const LINE_HEIGHT  = 6;
const MARGIN       = 20;
const PAGE_WIDTH   = 210;
const CONTENT_W    = PAGE_WIDTH - MARGIN * 2;
const PAGE_BREAK_Y = 265;

function addPage(doc: jsPDF): number {
  doc.addPage();
  return MARGIN;
}

function checkBreak(doc: jsPDF, y: number, needed = 14): number {
  return y > PAGE_BREAK_Y - needed ? addPage(doc) : y;
}

export function exportQuizToPdf(opts: QuizExportOptions): void {
  const { title, topic, grade, questions, includeAnswers, lang = "es" } = opts;
  const doc = new jsPDF();
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("AULA", MARGIN, y);
  doc.setFontSize(14);
  doc.text(` — ${title}`, MARGIN + 18, y);
  y += 9;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${lang === "es" ? "Tema" : "Topic"}: ${topic}`, MARGIN, y);    y += LINE_HEIGHT;
  doc.text(`${lang === "es" ? "Grado" : "Grade"}: ${grade}`, MARGIN, y);   y += LINE_HEIGHT;

  const nameLabel = lang === "es"
    ? "Nombre: ____________________________  Fecha: ____________"
    : "Name: ______________________________  Date: _____________";
  doc.text(nameLabel, MARGIN, y);
  y += LINE_HEIGHT * 2;

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(180);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += LINE_HEIGHT;

  // ── Questions ───────────────────────────────────────────────────────────────
  questions.forEach((q, idx) => {
    y = checkBreak(doc, y, 20);

    // Question text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, CONTENT_W);
    doc.text(qLines, MARGIN, y);
    y += qLines.length * LINE_HEIGHT + 2;

    const isMultipleChoice = Array.isArray(q.options) && q.options.length > 0;

    if (isMultipleChoice && q.options) {
      // ── Multiple choice options ────────────────────────────────────────────
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      q.options.forEach((opt) => {
        y = checkBreak(doc, y, LINE_HEIGHT);
        // Derive letter from option prefix "A) ..." or "A. ..."
        const firstChar = opt.trim()[0]?.toUpperCase() ?? "";
        const isCorrect =
          includeAnswers &&
          (q.answer.toUpperCase() === firstChar ||
           q.answer.toUpperCase().startsWith(firstChar));

        const mark = isCorrect ? "  ✓" : "";
        if (isCorrect) {
          doc.setFont("helvetica", "bold");
        }
        const optLines = doc.splitTextToSize(`    ${opt}${mark}`, CONTENT_W - 4);
        doc.text(optLines, MARGIN, y);
        doc.setFont("helvetica", "normal");
        y += optLines.length * LINE_HEIGHT;
      });

    } else {
      // ── Open question — blank lines ────────────────────────────────────────
      doc.setDrawColor(200);
      doc.setFont("helvetica", "normal");
      for (let line = 0; line < 4; line++) {
        y = checkBreak(doc, y, 10);
        doc.line(MARGIN + 5, y, PAGE_WIDTH - MARGIN, y);
        y += 9;
      }

      if (includeAnswers && q.answer) {
        y = checkBreak(doc, y, 8);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const ansLabel = lang === "es" ? "Resp.: " : "Ans.: ";
        const ansLines = doc.splitTextToSize(ansLabel + q.answer, CONTENT_W - 4);
        doc.text(ansLines, MARGIN + 5, y);
        y += ansLines.length * 5;
        doc.setFontSize(10);
      }
    }

    // ── Explanation (teacher version only) ────────────────────────────────────
    if (includeAnswers && q.explanation) {
      y = checkBreak(doc, y, 8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const explLines = doc.splitTextToSize(`\u{1F4A1} ${q.explanation}`, CONTENT_W - 4);
      doc.text(explLines, MARGIN + 4, y);
      doc.setTextColor(0, 0, 0);
      y += explLines.length * 5;
      doc.setFontSize(10);
    }

    y += LINE_HEIGHT; // spacing between questions
  });

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Generado por AULA — aula.run", MARGIN, 292);
    doc.text(`${p} / ${pageCount}`, PAGE_WIDTH - MARGIN, 292, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  const suffix = includeAnswers ? (lang === "es" ? "profesor" : "teacher") : (lang === "es" ? "estudiante" : "student");
  const filename = `quiz-${topic.replace(/\s+/g, "-").toLowerCase()}-${suffix}.pdf`;
  doc.save(filename);
}
