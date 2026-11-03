import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CompanyProfile } from "@/lib/company";

/**
 * Pembangun dokumen A4 sederhana di atas pdf-lib (JavaScript murni, tanpa Chromium atau berkas font).
 * Font standar PDF hanya mendukung Latin-1, jadi teks dinormalkan lewat `clean`.
 */

export const PAGE = { width: 595.28, height: 841.89, margin: 42 } as const;
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.36, 0.4, 0.47);
const LINE = rgb(0.82, 0.85, 0.89);
const ACCENT = rgb(0.96, 0.62, 0.04);

/** Karakter di luar Latin-1 diganti padanannya; sisanya "?" agar PDF tidak gagal dibuat. */
export function clean(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[\r\t]/g, " ")
    .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "?");
}

/** 1250000 → "Rp 1.250.000" (spasi biasa, bukan NBSP). */
export function rp(value: number | string | { toString(): string }): string {
  const text = value.toString();
  const negative = text.startsWith("-");
  const [intPart] = (negative ? text.slice(1) : text).split(".");
  return `${negative ? "-" : ""}Rp ${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Tanggal murni (UTC) → "28 Oktober 2026". */
export function longDate(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export type Align = "left" | "right";

export class PdfBuilder {
  private constructor(
    readonly doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
    private readonly onNewPage: (builder: PdfBuilder) => void,
  ) {}

  page!: PDFPage;
  y = 0;

  static async create(onNewPage: (builder: PdfBuilder) => void = () => undefined): Promise<PdfBuilder> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const builder = new PdfBuilder(doc, font, bold, onNewPage);
    builder.addPage(false);
    return builder;
  }

  get contentWidth(): number {
    return PAGE.width - PAGE.margin * 2;
  }

  addPage(runHook = true): void {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
    if (runHook) this.onNewPage(this);
  }

  /** Pastikan masih ada ruang `height` poin; jika tidak, pindah ke halaman baru. */
  ensure(height: number): void {
    if (this.y - height < PAGE.margin + 28) this.addPage();
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of clean(text).split("\n")) {
      let current = "";
      for (const word of paragraph.split(" ")) {
        let piece = word;
        // Kata yang lebih lebar dari kolom dipotong per karakter.
        while (font.widthOfTextAtSize(piece, size) > maxWidth && piece.length > 1) {
          let cut = piece.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(piece.slice(0, cut), size) > maxWidth) cut--;
          if (current) {
            lines.push(current);
            current = "";
          }
          lines.push(piece.slice(0, cut));
          piece = piece.slice(cut);
        }
        const candidate = current ? `${current} ${piece}` : piece;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
        else {
          if (current) lines.push(current);
          current = piece;
        }
      }
      lines.push(current);
    }
    return lines;
  }

  text(value: string, x: number, y: number, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: Align; width?: number } = {}): void {
    const { size = 9.5, bold = false, color = INK, align = "left", width = 0 } = options;
    const font = bold ? this.bold : this.font;
    const safe = clean(value).replace(/\n/g, " ");
    const drawX = align === "right" ? x + width - font.widthOfTextAtSize(safe, size) : x;
    this.page.drawText(safe, { x: drawX, y, size, font, color });
  }

  /** Paragraf yang membungkus kata; mengembalikan tinggi yang terpakai dan menggeser kursor. */
  paragraph(value: string, options: { x?: number; width?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; leading?: number } = {}): void {
    const { x = PAGE.margin, width = this.contentWidth, size = 9.5, bold = false, color = INK, leading = size * 1.4 } = options;
    for (const line of this.wrap(value, bold ? this.bold : this.font, size, width)) {
      this.ensure(leading);
      this.y -= leading;
      this.text(line, x, this.y, { size, bold, color });
    }
  }

  rule(color = LINE, thickness = 0.7): void {
    this.page.drawLine({ start: { x: PAGE.margin, y: this.y }, end: { x: PAGE.width - PAGE.margin, y: this.y }, thickness, color });
  }

  gap(points: number): void {
    this.y -= points;
  }

  /** Kop surat: nama perusahaan, kontak, dan garis aksen. */
  letterhead(company: CompanyProfile): void {
    this.page.drawRectangle({ x: PAGE.margin, y: PAGE.height - PAGE.margin - 2, width: this.contentWidth, height: 3, color: ACCENT });
    this.y = PAGE.height - PAGE.margin - 22;
    this.text(company.name, PAGE.margin, this.y, { size: 16, bold: true });
    const contact = [company.address, [company.phone, company.email].filter(Boolean).join("  |  ")].filter(Boolean);
    for (const row of contact) {
      for (const line of this.wrap(row, this.font, 8.5, this.contentWidth)) {
        this.y -= 11.5;
        this.text(line, PAGE.margin, this.y, { size: 8.5, color: MUTED });
      }
    }
    this.y -= 8;
    this.rule();
    this.y -= 6;
  }

  /** Nomor halaman "Halaman x dari y" di setiap halaman; panggil sekali di akhir. */
  numberPages(footer: string): void {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      page.drawText(clean(footer), { x: PAGE.margin, y: 24, size: 7.5, font: this.font, color: MUTED });
      const label = `Halaman ${index + 1} dari ${pages.length}`;
      page.drawText(label, { x: PAGE.width - PAGE.margin - this.font.widthOfTextAtSize(label, 7.5), y: 24, size: 7.5, font: this.font, color: MUTED });
    });
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

export const COLORS = { INK, MUTED, LINE, ACCENT, WHITE: rgb(1, 1, 1) };
