import type { CompanyProfile } from "@/lib/company";
import { clean, COLORS, longDate, PAGE, PdfBuilder, rp } from "./builder";

export type PdfParty = { companyName: string; picName: string; picPhone: string; address: string };

export type PdfLine = { description: string; qty: number; unitPrice: string; subtotal: string };

export type PdfTotals = { subtotal: string; discount: string; taxPpn: string; total: string };

type CommonDocument = {
  company: CompanyProfile;
  title: string;
  number: string;
  customer: PdfParty;
  meta: [label: string, value: string][];
  lines: PdfLine[];
  totals: PdfTotals;
  totalLabel: string;
  notes: string | null;
  /** Paragraf tambahan di bawah tabel (syarat, cara pembayaran). */
  terms: string[];
};

const COLS = { no: 22, qty: 44, price: 88, amount: 92 } as const;

async function renderDocument(doc: CommonDocument): Promise<Uint8Array> {
  const header = (b: PdfBuilder) => {
    if (b.doc.getPageCount() > 1) {
      b.y = PAGE.height - PAGE.margin;
      b.text(`${doc.title} ${doc.number}`, PAGE.margin, b.y - 8, { size: 9, bold: true, color: COLORS.MUTED });
      b.y -= 22;
    }
  };
  const b = await PdfBuilder.create(header);
  b.letterhead(doc.company);

  // Judul dan nomor
  b.gap(14);
  b.text(doc.title, PAGE.margin, b.y - 14, { size: 18, bold: true });
  b.text(doc.number, PAGE.margin, b.y - 30, { size: 11, color: COLORS.MUTED });
  b.gap(46);

  // Blok "Kepada" (kiri) dan meta (kanan)
  const half = b.contentWidth / 2;
  const topY = b.y;
  b.text("KEPADA", PAGE.margin, topY, { size: 8, bold: true, color: COLORS.MUTED });
  let leftY = topY - 14;
  b.text(doc.customer.companyName, PAGE.margin, leftY, { size: 10.5, bold: true });
  for (const line of b.wrap(doc.customer.address, b.font, 9, half - 16)) {
    leftY -= 12;
    b.text(line, PAGE.margin, leftY, { size: 9 });
  }
  leftY -= 12;
  b.text(`UP: ${doc.customer.picName}  |  ${doc.customer.picPhone}`, PAGE.margin, leftY, { size: 9, color: COLORS.MUTED });

  let rightY = topY;
  const metaX = PAGE.margin + half + 24;
  const metaW = half - 24;
  for (const [label, value] of doc.meta) {
    b.text(label, metaX, rightY, { size: 8.5, color: COLORS.MUTED });
    b.text(value, metaX, rightY, { size: 9, bold: true, align: "right", width: metaW });
    rightY -= 14;
  }
  b.y = Math.min(leftY, rightY) - 18;

  // Tabel
  const descW = b.contentWidth - COLS.no - COLS.qty - COLS.price - COLS.amount;
  const xNo = PAGE.margin;
  const xDesc = xNo + COLS.no;
  const xQty = xDesc + descW;
  const xPrice = xQty + COLS.qty;
  const xAmount = xPrice + COLS.price;
  const tableHead = () => {
    b.ensure(40);
    b.page.drawRectangle({ x: PAGE.margin, y: b.y - 16, width: b.contentWidth, height: 18, color: COLORS.INK });
    const head = { size: 8.5, bold: true, color: COLORS.WHITE } as const;
    b.text("No", xNo + 5, b.y - 11, head);
    b.text("Uraian", xDesc, b.y - 11, head);
    b.text("Jml", xQty, b.y - 11, { ...head, align: "right", width: COLS.qty - 6 });
    b.text("Harga satuan", xPrice, b.y - 11, { ...head, align: "right", width: COLS.price - 6 });
    b.text("Jumlah", xAmount, b.y - 11, { ...head, align: "right", width: COLS.amount - 5 });
    b.y -= 20;
  };
  tableHead();
  doc.lines.forEach((line, index) => {
    const wrapped = b.wrap(line.description, b.font, 9, descW - 8);
    const rowH = Math.max(1, wrapped.length) * 12 + 8;
    if (b.y - rowH < PAGE.margin + 28) {
      b.addPage();
      tableHead();
    }
    const base = b.y - 13;
    b.text(String(index + 1), xNo + 5, base, { size: 9 });
    wrapped.forEach((part, i) => b.text(part, xDesc, base - i * 12, { size: 9 }));
    b.text(line.qty.toLocaleString("id-ID"), xQty, base, { size: 9, align: "right", width: COLS.qty - 6 });
    b.text(line.unitPrice, xPrice, base, { size: 9, align: "right", width: COLS.price - 6 });
    b.text(line.subtotal, xAmount, base, { size: 9, bold: true, align: "right", width: COLS.amount - 5 });
    b.y -= rowH;
    b.page.drawLine({ start: { x: PAGE.margin, y: b.y }, end: { x: PAGE.width - PAGE.margin, y: b.y }, thickness: 0.5, color: COLORS.LINE });
  });

  // Total
  const totalRows: [string, string, boolean][] = [["Subtotal", doc.totals.subtotal, false]];
  if (doc.totals.discount !== rp(0)) totalRows.push(["Diskon", `- ${doc.totals.discount}`, false]);
  if (doc.totals.taxPpn !== rp(0)) totalRows.push(["PPN 11%", doc.totals.taxPpn, false]);
  b.ensure(totalRows.length * 16 + 40);
  b.gap(10);
  const labelX = xPrice - 30;
  for (const [label, value] of totalRows) {
    b.text(label, labelX, b.y - 10, { size: 9.5, color: COLORS.MUTED });
    b.text(value, xAmount, b.y - 10, { size: 9.5, align: "right", width: COLS.amount - 5 });
    b.y -= 16;
  }
  b.gap(2);
  b.page.drawRectangle({ x: labelX - 6, y: b.y - 18, width: PAGE.width - PAGE.margin - labelX + 6, height: 22, color: COLORS.ACCENT });
  b.text(doc.totalLabel, labelX, b.y - 11, { size: 10.5, bold: true });
  b.text(doc.totals.total, xAmount, b.y - 11, { size: 10.5, bold: true, align: "right", width: COLS.amount - 5 });
  b.y -= 34;
  if (doc.totals.taxPpn === rp(0)) {
    b.text("Harga tidak dikenakan PPN.", PAGE.margin, b.y, { size: 8.5, color: COLORS.MUTED });
    b.y -= 16;
  }

  // Catatan dan ketentuan
  if (doc.notes) {
    b.ensure(40);
    b.text("Catatan", PAGE.margin, b.y, { size: 9, bold: true });
    b.y -= 2;
    b.paragraph(doc.notes, { size: 9, color: COLORS.INK });
    b.gap(14);
  }
  if (doc.terms.length > 0) {
    b.ensure(40);
    b.text("Ketentuan", PAGE.margin, b.y, { size: 9, bold: true });
    b.y -= 2;
    for (const term of doc.terms) b.paragraph(`- ${term}`, { size: 8.5, color: COLORS.MUTED });
    b.gap(10);
  }

  // Tanda tangan
  b.ensure(80);
  b.y -= 6;
  b.text("Hormat kami,", PAGE.width - PAGE.margin - 160, b.y, { size: 9 });
  b.text(doc.company.name, PAGE.width - PAGE.margin - 160, b.y - 62, { size: 9, bold: true });
  b.page.drawLine({ start: { x: PAGE.width - PAGE.margin - 160, y: b.y - 54 }, end: { x: PAGE.width - PAGE.margin, y: b.y - 54 }, thickness: 0.6, color: COLORS.MUTED });

  b.numberPages(clean(`${doc.title} ${doc.number}  |  ${doc.company.name}`));
  return b.save();
}

export type QuotationPdfInput = {
  company: CompanyProfile;
  number: string;
  customer: PdfParty;
  issuedAt: Date;
  validUntil: Date;
  lines: PdfLine[];
  totals: PdfTotals;
  notes: string | null;
};

export function renderQuotationPdf(input: QuotationPdfInput): Promise<Uint8Array> {
  return renderDocument({
    company: input.company,
    title: "PENAWARAN HARGA",
    number: input.number,
    customer: input.customer,
    meta: [
      ["Tanggal", longDate(input.issuedAt)],
      ["Berlaku sampai", longDate(input.validUntil)],
    ],
    lines: input.lines,
    totals: input.totals,
    totalLabel: "TOTAL",
    notes: input.notes,
    terms: [`Penawaran ini berlaku sampai ${longDate(input.validUntil)}.`, "Harga dalam Rupiah. Ketersediaan barang mengikuti stok saat pesanan dikonfirmasi."],
  });
}

export type InvoicePdfInput = {
  company: CompanyProfile;
  number: string;
  customer: PdfParty;
  issueDate: Date;
  dueDate: Date;
  topDays: number;
  references: string[];
  lines: PdfLine[];
  totals: PdfTotals;
  paid: string | null;
};

export function renderInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const terms = [`Pembayaran paling lambat ${longDate(input.dueDate)} (TOP ${input.topDays} hari sejak tanggal terbit).`];
  if (input.company.bank) terms.push(`Pembayaran ditransfer ke: ${input.company.bank}.`);
  terms.push("Mohon cantumkan nomor invoice pada berita transfer.");
  if (input.paid) terms.push(`Telah dibayar: ${input.paid}.`);
  return renderDocument({
    company: input.company,
    title: "INVOICE",
    number: input.number,
    customer: input.customer,
    meta: [
      ["Tanggal terbit", longDate(input.issueDate)],
      ["Jatuh tempo", longDate(input.dueDate)],
      ["TOP", `${input.topDays} hari`],
      ...input.references.map((ref, i) => [i === 0 ? "Referensi" : "", ref] as [string, string]),
    ],
    lines: input.lines,
    totals: input.totals,
    totalLabel: "TOTAL TAGIHAN",
    notes: null,
    terms,
  });
}
