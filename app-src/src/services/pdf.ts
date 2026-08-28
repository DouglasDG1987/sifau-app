// ============================================================
// SIFAU — Geração de PDF do relatório de vistoria (jsPDF)
// ============================================================
import { jsPDF } from "jspdf";
import type { OrdemServico, Vistoria, AutoInfracao, TipoInfracao } from "@/lib/types";
import { fmtDateTime, fmtCurrency } from "@/lib/utils";
import { ORIGEM_OS_LABELS, CIENCIA_LABELS } from "@/lib/types";

export interface PdfVistoriaData {
  prefeitura: string;
  os: OrdemServico;
  vistoria: Vistoria;
  auto: (AutoInfracao & { tipo_infracao?: TipoInfracao | null }) | null;
  fiscalNome: string;
  gerenteNome: string;
}

function drawHeader(doc: jsPDF, prefeitura: string, os: OrdemServico) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(23, 80, 171); // azul institucional
  doc.rect(0, 0, w, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(prefeitura, 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SIFAU — Sistema de Fiscalização e Atendimento Urbano", 14, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Ordem de Serviço ${os.numero_os}`, 14, 30);
}

export function generateOSVistoriaPdf(data: PdfVistoriaData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;

  drawHeader(doc, data.prefeitura, data.os);

  let y = 44;
  const section = (title: string) => {
    doc.setFillColor(229, 238, 250);
    doc.rect(margin, y - 5, contentW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(23, 80, 171);
    doc.text(title, margin + 3, y);
    doc.setTextColor(30, 41, 59);
    y += 8;
  };
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(label, margin, y);
    const labelW = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + labelW + 2, y);
    y += 5.5;
  };
  const para = (text: string, size = 9.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4.6 + 2;
  };
  const ensureSpace = (needed: number) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  };

  section("Dados administrativos");
  line("Origem:", ORIGEM_OS_LABELS[data.os.origem_os]);
  line("Requerente:", data.os.requerente);
  line("Fiscal responsável:", data.fiscalNome);
  line("Gestor responsável:", data.gerenteNome);
  line("Endereço:", data.os.endereco);
  line("Emissão:", fmtDateTime(data.os.data_emissao));
  line("Prazo de resposta:", fmtDateTime(data.os.prazo_resposta));
  if (data.os.apoio_operacional) {
    line("Apoio operacional:", data.os.orgao_apoio === "outro" ? data.os.orgao_apoio_outro ?? "Outro" : (data.os.orgao_apoio ?? ""));
  }
  y += 2;

  section("Serviço / objeto da vistoria");
  para(data.os.servico_descricao);

  section("Relatório técnico do fiscal");
  ensureSpace(40);
  para(data.vistoria.relatorio ?? "Sem relatório registrado.");

  section("Registro de início");
  line("Início:", fmtDateTime(data.vistoria.iniciada_em));
  line("Fim:", fmtDateTime(data.vistoria.finalizada_em));
  if (data.vistoria.geo_inicio_lat != null && data.vistoria.geo_inicio_lng != null) {
    line("GPS início:", `${data.vistoria.geo_inicio_lat.toFixed(5)}, ${data.vistoria.geo_inicio_lng.toFixed(5)} (precisão ${Math.round(data.vistoria.geo_inicio_precisao_m ?? 0)}m)`);
  }
  y += 2;

  if (data.vistoria.fotos.length > 0) {
    section("Fotos da vistoria");
    ensureSpace(80);
    const side = 84;
    const rows = Math.ceil(data.vistoria.fotos.length / 2);
    for (let i = 0; i < Math.min(data.vistoria.fotos.length, 4); i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      try {
        const img = doc.getImageProperties(data.vistoria.fotos[i]);
        const ratio = img.height / img.width;
        let h = side;
        let w = side / ratio;
        if (w > side) {
          w = side;
          h = side * ratio;
        }
        ensureSpace(h + 6);
        doc.addImage(data.vistoria.fotos[i], "JPEG", margin + col * (side + 6), y, w, h);
        if (col === 1 || i === Math.min(data.vistoria.fotos.length, 4) - 1) y += h + 6;
      } catch {
        /* foto inválida — ignora */
      }
    }
    void rows;
  }

  if (data.auto) {
    section("Auto de Infração");
    ensureSpace(50);
    line("Artigo legal:", data.auto.tipo_infracao?.artigo_legal ?? "");
    line("Infração:", data.auto.tipo_infracao?.descricao ?? "");
    line("Valor da multa:", fmtCurrency(data.auto.valor_multa));
    line("Autuado:", data.auto.autuado_nome ?? "—");
    line("Documento:", data.auto.autuado_documento ?? "—");
    line("Ciência do autuado:", CIENCIA_LABELS[data.auto.ciencia_status]);
    line("Testemunha:", data.auto.testemunha_nome ?? "—");
    if (data.auto.motivo) {
      y += 2;
      para(`Motivo: ${data.auto.motivo}`);
    }
  }

  y += 6;
  ensureSpace(34);
  section("Assinaturas");
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("_________________________________________", margin, y);
  doc.text("Fiscal responsável", margin + 2, y + 4);
  doc.text("_________________________________________", margin + contentW - 70, y);
  doc.text("Autuado / responsável", margin + contentW - 68, y + 4);
  y += 14;
  doc.text("Documento gerado eletronicamente pelo SIFAU. Autenticidade verificável via trilha de auditoria.", margin, y);

  doc.save(`vistoria-${data.os.numero_os}.pdf`);
}
