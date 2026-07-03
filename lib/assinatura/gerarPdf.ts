import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface DadosTermo {
  nomeClinica: string
  nomePaciente: string
  cpfPaciente?: string | null
  data: string
  consentimentoClinico: boolean
  autorizacaoMarketing: boolean
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim()
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function gerarPdfTermo(dados: DadosTermo): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4

  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvetica    = await doc.embedFont(StandardFonts.Helvetica)

  const { width, height } = page.getSize()
  const marginX = 60
  const lineH = 16
  let y = height - 60

  function drawText(text: string, opts: {
    bold?: boolean; size?: number; color?: [number, number, number]; indent?: number
  } = {}) {
    const font = opts.bold ? helveticaBold : helvetica
    const size = opts.size ?? 11
    const [r, g, b] = opts.color ?? [0.07, 0.09, 0.12]
    const x = marginX + (opts.indent ?? 0)
    const maxChars = Math.floor((width - x - marginX) / (size * 0.52))
    const lines = wrap(text, maxChars)
    for (const line of lines) {
      if (y < 60) return
      page.drawText(line, { x, y, size, font, color: rgb(r, g, b) })
      y -= lineH * (size / 11)
    }
  }

  function spacer(n = 1) { y -= lineH * n }

  // Cabeçalho
  drawText(dados.nomeClinica.toUpperCase(), { bold: true, size: 13 })
  spacer(0.5)
  drawText('TERMO DE CONSENTIMENTO INFORMADO', { bold: true, size: 12 })
  spacer(2)

  // Identificação
  drawText(`Paciente: ${dados.nomePaciente}`, { bold: true })
  if (dados.cpfPaciente) drawText(`CPF: ${dados.cpfPaciente}`)
  drawText(`Data: ${dados.data}`)
  spacer(1.5)

  // Consentimento clínico
  drawText('CONSENTIMENTO CLÍNICO', { bold: true, size: 11 })
  spacer(0.5)
  drawText(
    `Eu, ${dados.nomePaciente}, declaro que fui devidamente informada pela equipe da ${dados.nomeClinica} sobre os procedimentos a serem realizados, seus objetivos, benefícios esperados, riscos possíveis, efeitos colaterais e alternativas de tratamento. Declaro ainda que tive a oportunidade de esclarecer todas as minhas dúvidas e que compreendi as informações recebidas.`
  )
  spacer(0.5)
  drawText('Riscos informados:', { bold: true })
  drawText('Hematomas, edema, eritema, dormência transitória, resultado variável individual, necessidade de retoques.')
  spacer(0.5)
  drawText('Contraindicações verificadas:', { bold: true })
  drawText('Gestação, lactação, uso de anticoagulantes, alergias ao produto, infecções ativas na área.')
  spacer(1)

  if (dados.autorizacaoMarketing) {
    drawText('AUTORIZAÇÃO DE USO DE IMAGEM', { bold: true, size: 11 })
    spacer(0.5)
    drawText(
      `Autorizo a equipe da ${dados.nomeClinica} a registrar fotografias de antes e depois do meu tratamento e a utilizar tais imagens para fins de divulgação nos perfis da clínica (Instagram, site e outros meios digitais). Esta autorização pode ser revogada a qualquer momento mediante solicitação escrita.`
    )
    spacer(1.5)
  } else {
    spacer(0.5)
    drawText('Uso de imagem: NÃO AUTORIZADO', { bold: true })
    spacer(1.5)
  }

  // Área de assinatura
  const sigY = y - 20
  page.drawLine({
    start: { x: marginX, y: sigY },
    end: { x: width / 2 - 20, y: sigY },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  })
  page.drawText('Assinatura da Paciente', {
    x: marginX, y: sigY - 16, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4)
  })
  page.drawText(dados.nomePaciente, {
    x: marginX, y: sigY - 28, size: 9, font: helveticaBold, color: rgb(0.07, 0.09, 0.12)
  })

  page.drawLine({
    start: { x: width / 2 + 20, y: sigY },
    end: { x: width - marginX, y: sigY },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  })
  page.drawText('Responsável Técnico', {
    x: width / 2 + 20, y: sigY - 16, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4)
  })

  // Rodapé
  page.drawText(
    `Documento gerado em ${dados.data} — ${dados.nomeClinica}`,
    { x: marginX, y: 40, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6) }
  )

  return doc.save()
}
