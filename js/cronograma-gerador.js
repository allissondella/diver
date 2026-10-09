/*
 * cronograma-gerador.js — a conta do Cronograma (aba Organizar → Cronograma).
 *
 * Sem IA e sem internet: só pesos e horas. A mesma entrada gera sempre o mesmo plano.
 *  - Três eixos: peso na prova (Enem: questões por disciplina), dificuldade (nota de 1 a 5 do aluno)
 *    e tempo disponível (minutos por dia da semana; 0 = descanso).
 *  - Nunca zera uma disciplina (piso de participação), intercala as matérias (no máximo 2 blocos da
 *    mesma por dia e nunca duas seguidas), revisão espaçada (revê o que foi estudado ~7 dias antes),
 *    simulado a cada 2 semanas (toda semana na reta final), redação toda semana no Enem e a reta
 *    final (últimas 3 semanas) com menos conteúdo novo. A véspera da prova é descanso.
 *  - Blocos de 25 ou 50 minutos (os dois presets do Modo Foco). A unidade de tempo é a "vaga" de
 *    30 minutos: 25 de foco + 5 de pausa. Bloco de 50 = 2 vagas; simulado = 4 vagas (2 horas).
 *  - O plano cobre no máximo 16 semanas de cada vez ("Continuar o plano" gera o trecho seguinte).
 * Funções puras (sem DOM nem localStorage): dá para testar no Node.
 */
const CronogramaGerador = (() => {
  const VAGA = 30; // minutos por vaga (25 de foco + 5 de pausa)
  const SEMANAS_MAX = 16;
  const RETA_FINAL = 21; // dias

  /**
   * Disciplinas. peso = questões por prova no Enem (as 4 áreas têm 45 cada; dentro da área, a divisão
   * segue o mapa tema × peso das provas de 2019 a 2025, docs/cadernos/enem-vestibular.md).
   * temas = sugestões para o bloco, na ordem do que mais cai. curso = fase do Diver para estudar.
   */
  /*
   * curso: o "Comece por aqui" (enem-vestibular), que todo mundo do Enem tem.
   * cursos (2026-10-09): os cursos por matéria. O Cronograma usa o primeiro que a pessoa tem;
   * com mais de um (Português, Literatura, Artes), reveza pelo peso; na língua estrangeira, segue a
   * língua escolhida na Avaliação Diagnóstica. Não entra na conta do plano: só diz onde estudar.
   */
  const DISCIPLINAS = [
    { id: 'matematica', nome: 'Matemática', area: 'Matemática', peso: 45,
      temas: ['Estatística e leitura de dados', 'Geometria plana', 'Porcentagem e matemática financeira', 'Geometria espacial', 'Razão, proporção e escala', 'Probabilidade e contagem'],
      curso: { trilha: 'enem-vestibular', fase: 'matematica-1' }, cursos: [{ trilha: 'enem-matematica' }] },
    { id: 'portugues', nome: 'Português e Literatura', area: 'Linguagens', peso: 40,
      temas: ['Interpretação e gêneros', 'Literatura', 'Artes', 'Variação e gramática', 'Tecnologias e comunicação'],
      curso: { trilha: 'enem-vestibular', fase: 'linguagens-1' },
      cursos: [{ trilha: 'enem-portugues', peso: 35 }, { trilha: 'enem-literatura', peso: 20 }, { trilha: 'enem-artes-ef', peso: 12 }] },
    { id: 'lingua-estrangeira', nome: 'Língua estrangeira', area: 'Linguagens', peso: 5, temas: ['Leitura e interpretação'],
      curso: { trilha: 'enem-vestibular', fase: 'linguagens-1' }, cursos: [{ trilha: 'enem-ingles', lingua: 'ingles' }, { trilha: 'enem-espanhol', lingua: 'espanhol' }] },
    { id: 'historia', nome: 'História', area: 'Humanas', peso: 15,
      temas: ['História do Brasil', 'História geral'],
      curso: { trilha: 'enem-vestibular', fase: 'humanas-1' }, cursos: [{ trilha: 'enem-historia' }] },
    { id: 'geografia', nome: 'Geografia', area: 'Humanas', peso: 18, temas: ['Espaço urbano, agrário e economia', 'Natureza e ambiente'],
      curso: { trilha: 'enem-vestibular', fase: 'humanas-1' }, cursos: [{ trilha: 'enem-geografia' }] },
    { id: 'filosofia', nome: 'Filosofia', area: 'Humanas', peso: 6, temas: [],
      curso: { trilha: 'enem-vestibular', fase: 'humanas-1' }, cursos: [{ trilha: 'enem-filosofia' }] },
    { id: 'sociologia', nome: 'Sociologia', area: 'Humanas', peso: 6, temas: [],
      curso: { trilha: 'enem-vestibular', fase: 'humanas-1' }, cursos: [{ trilha: 'enem-sociologia' }] },
    { id: 'fisica', nome: 'Física', area: 'Natureza', peso: 13,
      temas: ['Mecânica', 'Ondas e óptica', 'Eletricidade', 'Calor e energia'],
      curso: { trilha: 'enem-vestibular', fase: 'natureza-1' }, cursos: [{ trilha: 'enem-fisica' }] },
    { id: 'quimica', nome: 'Química', area: 'Natureza', peso: 16,
      temas: ['Reações e estequiometria', 'Ácidos e bases', 'Química orgânica'],
      curso: { trilha: 'enem-vestibular', fase: 'natureza-1' }, cursos: [{ trilha: 'enem-quimica' }] },
    { id: 'biologia', nome: 'Biologia', area: 'Natureza', peso: 16,
      temas: ['Saúde e fisiologia', 'Ecologia', 'Genética'],
      curso: { trilha: 'enem-vestibular', fase: 'natureza-1' }, cursos: [{ trilha: 'enem-biologia' }] },
    { id: 'redacao', nome: 'Redação', area: 'Redação', peso: 0, temas: ['Uma redação completa', 'Proposta de intervenção', 'Repertório e argumentos'],
      curso: { trilha: 'enem-vestibular', fase: 'redacao-1' }, cursos: [{ trilha: 'enem-redacao' }] },
  ];
  const AREAS_SIMULADO = ['Linguagens', 'Humanas', 'Natureza', 'Matemática'];
  const PESO_ESCOLHIDO = { muito: 30, medio: 18, pouco: 8 }; // outras provas: o aluno diz quanto cai
  const FATOR_NOTA = { 1: 1.6, 2: 1.35, 3: 1, 4: 0.75, 5: 0.55 }; // nota baixa = precisa de mais tempo
  const PISO = 0.05; // nenhuma disciplina fica com menos de 5% do conteúdo

  const disciplina = (id) => DISCIPLINAS.find((d) => d.id === id);

  /* ---------- Datas (texto AAAA-MM-DD, no fuso local) ---------- */
  function paraData(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function texto(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function somarDias(iso, n) {
    const d = paraData(iso);
    d.setDate(d.getDate() + n);
    return texto(d);
  }
  function diasEntre(a, b) {
    return Math.round((paraData(b) - paraData(a)) / 864e5);
  }
  const diaDaSemana = (iso) => paraData(iso).getDay();

  /** Peso de cada disciplina escolhida (já com a nota e o piso), somando 1. Redação fica de fora (tem bloco semanal). */
  function pesos(params) {
    const lista = (params.materias || []).filter((m) => m.id !== 'redacao');
    if (!lista.length) return {};
    const bruto = {};
    lista.forEach((m) => {
      const d = disciplina(m.id);
      const base = params.objetivo.tipo === 'enem' && d ? d.peso : PESO_ESCOLHIDO[m.peso] || PESO_ESCOLHIDO.medio;
      bruto[m.id] = base * (FATOR_NOTA[m.nota] || 1);
    });
    const soma = Object.values(bruto).reduce((a, b) => a + b, 0);
    const out = {};
    Object.keys(bruto).forEach((k) => (out[k] = bruto[k] / soma));
    // piso: quem ficou abaixo sobe para 5% e os outros cedem proporcionalmente
    const piso = Math.min(PISO, 1 / Object.keys(out).length);
    const baixos = Object.keys(out).filter((k) => out[k] < piso);
    if (baixos.length) {
      const resto = 1 - piso * baixos.length;
      const somaAltos = Object.keys(out).filter((k) => !baixos.includes(k)).reduce((a, k) => a + out[k], 0);
      Object.keys(out).forEach((k) => (out[k] = baixos.includes(k) ? piso : (out[k] / somaAltos) * resto));
    }
    return out;
  }

  /** Vagas de 30 min do dia (0 = descanso). A véspera da prova é sempre descanso. */
  function vagasDoDia(params, iso) {
    if (iso >= somarDias(params.objetivo.data, -1)) return 0;
    const min = Number((params.tempo.minutos || {})[diaDaSemana(iso)]) || 0;
    return Math.floor(min / VAGA);
  }

  /** Nome curto do bloco, para Tarefas, Calendário e a lista. */
  function titulo(b) {
    const d = disciplina(b.materia);
    const nome = b.nomeMateria || (d ? d.nome : b.materia);
    if (b.tipo === 'simulado') return `Simulado: ${b.area || 'prova completa'}`;
    if (b.tipo === 'redacao') return `Redação: ${b.tema || 'uma redação completa'}`;
    if (b.tipo === 'revisao') return `Revisão: ${nome}`;
    return b.tema ? `${nome}: ${b.tema}` : nome;
  }

  /**
   * Gera os blocos de `inicio` (inclusive) até a véspera da prova, no máximo 16 semanas.
   * params: { objetivo: { tipo: 'enem'|'vestibular'|'outra', nome, data }, tempo: { minutos: {0..6: min}, hora },
   *           materias: [{ id, nome?, nota: 1..5, peso?: 'muito'|'medio'|'pouco' }] }
   * opcoes: { fixos: [blocos que ficam onde estão], historico: [blocos já feitos/antigos, para revisão e rodízio de temas] }
   * Devolve { blocos, fim, cobreAteAProva, semanas }.
   */
  function gerar(params, inicio, opcoes = {}) {
    const prova = params.objetivo.data;
    const limite = somarDias(inicio, SEMANAS_MAX * 7);
    const fim = prova <= limite ? somarDias(prova, -1) : somarDias(limite, -1); // último dia do trecho (inclusive)
    const fixos = (opcoes.fixos || []).filter((b) => b.data >= inicio && b.data <= fim);
    const historico = opcoes.historico || [];
    const enem = params.objetivo.tipo === 'enem';
    const escolhidas = (params.materias || []).filter((m) => m.id !== 'redacao');
    const temRedacao = (params.materias || []).some((m) => m.id === 'redacao');
    const notaRedacao = ((params.materias || []).find((m) => m.id === 'redacao') || {}).nota || 3;
    const parte = pesos(params);
    const nomes = {};
    (params.materias || []).forEach((m) => (nomes[m.id] = m.nome || (disciplina(m.id) || {}).nome || m.id));

    // dias do trecho, com as vagas livres (descontando os blocos fixos)
    const dias = [];
    for (let iso = inicio; iso <= fim; iso = somarDias(iso, 1)) {
      const usadas = fixos.filter((b) => b.data === iso).reduce((a, b) => a + vagasDoBloco(b), 0);
      dias.push({ iso, vagas: Math.max(0, vagasDoDia(params, iso) - usadas), blocos: [] });
    }
    const retaFinal = (iso) => diasEntre(iso, prova) <= RETA_FINAL;
    const semanaDe = (iso) => Math.floor(diasEntre(inicio, iso) / 7);

    // 1) Por semana: simulado (a cada 2 semanas; toda semana na reta final) e redação (Enem ou se o aluno escolheu)
    const porSemana = {};
    dias.forEach((d) => (porSemana[semanaDe(d.iso)] = porSemana[semanaDe(d.iso)] || []).push(d));
    let areaSim = historico.filter((b) => b.tipo === 'simulado').length;
    Object.keys(porSemana).map(Number).sort((a, b) => a - b).forEach((s) => {
      const semana = porSemana[s];
      const total = semana.reduce((a, d) => a + d.vagas, 0);
      const naReta = semana.some((d) => retaFinal(d.iso));
      const querSimulado = (s % 2 === 1 || naReta) && total >= 6 && !fixos.some((b) => b.tipo === 'simulado' && semanaDe(b.data) === s);
      if (querSimulado) {
        const dia = [...semana].sort((a, b) => b.vagas - a.vagas || (a.iso < b.iso ? 1 : -1))[0];
        const vagas = dia.vagas >= 4 ? 4 : dia.vagas >= 2 ? 2 : 0;
        if (vagas) {
          const area = enem ? AREAS_SIMULADO[areaSim % AREAS_SIMULADO.length] : null;
          areaSim++;
          dia.blocos.push({ tipo: 'simulado', materia: null, area: area ? (vagas === 4 ? `${area}, 45 questões` : `${area}, mini (20 questões)`) : (vagas === 4 ? 'prova completa' : 'mini simulado'), dur: vagas === 4 ? 120 : 50, vagas });
          dia.vagas -= vagas;
        }
      }
      if ((enem || temRedacao) && total >= 3 && !fixos.some((b) => b.tipo === 'redacao' && semanaDe(b.data) === s)) {
        const vezes = notaRedacao <= 2 && total >= 10 ? 2 : 1;
        for (let k = 0; k < vezes; k++) {
          const candidatos = semana.filter((d) => d.vagas >= 2 && !d.blocos.some((b) => b.tipo === 'redacao'));
          const dia = candidatos.sort((a, b) => b.vagas - a.vagas || (a.iso < b.iso ? 1 : -1))[0];
          if (!dia) break;
          dia.blocos.push({ tipo: 'redacao', materia: 'redacao', dur: 50, vagas: 2 });
          dia.vagas -= 2;
        }
      }
    });

    // 2) Conteúdo e revisão, dia a dia, intercalando as matérias pelo "atraso" de cada uma
    const recebido = {};
    escolhidas.forEach((m) => (recebido[m.id] = 0));
    let totalConteudo = 0;
    const estudadoEm = []; // { iso, materia } (para a revisão espaçada)
    historico.filter((b) => b.tipo === 'conteudo').forEach((b) => estudadoEm.push({ iso: b.data, materia: b.materia }));
    let devendoRevisao = 0;
    dias.forEach((d) => {
      if (!escolhidas.length) return;
      const fracaoRevisao = retaFinal(d.iso) ? 0.4 : 0.2;
      let anterior = null;
      const noDia = {};
      [...fixos.filter((b) => b.data === d.iso), ...d.blocos].forEach((b) => { if (b.materia) noDia[b.materia] = (noDia[b.materia] || 0) + 1; });
      while (d.vagas > 0) {
        devendoRevisao += fracaoRevisao;
        if (devendoRevisao >= 1) {
          // revisão: o que foi estudado há uns 7 dias (ou o mais antigo ainda não revisto)
          devendoRevisao -= 1;
          const alvo = estudadoEm.filter((e) => diasEntre(e.iso, d.iso) >= 6).sort((a, b) => (a.iso < b.iso ? 1 : -1))[0]
            || estudadoEm.filter((e) => diasEntre(e.iso, d.iso) >= 1)[0];
          if (alvo && (noDia[alvo.materia] || 0) < 2 && alvo.materia !== anterior) {
            estudadoEm.splice(estudadoEm.indexOf(alvo), 1);
            d.blocos.push({ tipo: 'revisao', materia: alvo.materia, dur: 25, vagas: 1, de: alvo.iso });
            noDia[alvo.materia] = (noDia[alvo.materia] || 0) + 1;
            anterior = alvo.materia;
            d.vagas -= 1;
            continue;
          }
        }
        // conteúdo: a matéria mais "atrasada" em relação à parte dela, sem repetir a anterior e no máximo 2 por dia
        // (a conta é em minutos: um bloco de 50 vale o dobro de um de 25)
        const vagas = d.vagas >= 2 ? 2 : 1;
        const dur = vagas === 2 ? 50 : 25;
        const ordem = escolhidas
          .filter((m) => m.id !== anterior && (noDia[m.id] || 0) < 2)
          .sort((a, b) => (parte[b.id] * (totalConteudo + dur) - recebido[b.id]) - (parte[a.id] * (totalConteudo + dur) - recebido[a.id]) || (a.id < b.id ? -1 : 1));
        const m = ordem[0];
        if (!m) { d.vagas = 0; break; } // o dia já tem tudo o que cabe sem repetir demais
        d.blocos.push({ tipo: 'conteudo', materia: m.id, dur, vagas });
        recebido[m.id] += dur;
        totalConteudo += dur;
        noDia[m.id] = (noDia[m.id] || 0) + 1;
        estudadoEm.push({ iso: d.iso, materia: m.id });
        anterior = m.id;
        d.vagas -= vagas;
      }
    });

    // 3) Temas em rodízio (continuando de onde o histórico parou), ids, ordem e horário sugerido
    const temaVez = {};
    historico.forEach((b) => { if (b.tema && (b.tipo === 'conteudo' || b.tipo === 'redacao')) temaVez[b.materia] = (temaVez[b.materia] || 0) + 1; });
    const blocos = [];
    dias.forEach((d) => {
      // ordem do dia: simulado primeiro (precisa de cabeça fresca), depois conteúdo, redação e revisão por último
      const peso = { simulado: 0, conteudo: 1, redacao: 2, revisao: 3 };
      const doDia = intercalar([...fixos.filter((b) => b.data === d.iso), ...d.blocos.sort((a, b) => peso[a.tipo] - peso[b.tipo])]);
      let minuto = horaEmMinutos(params.tempo.hora || '19:00');
      doDia.forEach((b, i) => {
        if (!b.fixo) {
          const disc = disciplina(b.materia);
          if ((b.tipo === 'conteudo' || b.tipo === 'redacao') && disc && disc.temas.length) {
            const k = temaVez[b.materia] || 0;
            b.tema = disc.temas[k % disc.temas.length];
            temaVez[b.materia] = k + 1;
          }
          if (b.materia && !disciplina(b.materia)) b.nomeMateria = nomes[b.materia];
          b.id = `bloco-${d.iso.replace(/-/g, '')}-${i}-${b.tipo}-${b.materia || 'sim'}`;
          b.data = d.iso;
          b.feito = false;
          b.fixo = false;
          delete b.vagas;
        }
        b.ordem = i;
        b.hora = minutosEmHora(minuto);
        minuto += (b.dur || 25) + (b.dur >= 50 ? 10 : 5);
        blocos.push(b);
      });
    });
    return { blocos, inicio, fim, cobreAteAProva: prova <= limite, semanas: Math.ceil((diasEntre(inicio, fim) + 1) / 7) };
  }

  /** Troca blocos de lugar para nunca ficar a mesma matéria duas vezes seguidas (os fixos não saem do lugar). */
  function intercalar(lista) {
    const out = [...lista];
    const conflitos = (l) => l.reduce((n, b, i) => n + (i && b.materia && b.materia === l[i - 1].materia ? 1 : 0), 0);
    let atual = conflitos(out);
    for (let volta = 0; atual && volta < 20; volta++) {
      let melhor = null;
      for (let x = 0; x < out.length && !melhor; x++) {
        for (let y = x + 1; y < out.length; y++) {
          if (out[x].fixo || out[y].fixo) continue;
          [out[x], out[y]] = [out[y], out[x]];
          const c = conflitos(out);
          [out[x], out[y]] = [out[y], out[x]];
          if (c < atual) { melhor = [x, y, c]; break; }
        }
      }
      if (!melhor) break;
      const [x, y, c] = melhor;
      [out[x], out[y]] = [out[y], out[x]];
      atual = c;
    }
    return out;
  }

  function vagasDoBloco(b) {
    return b.tipo === 'simulado' ? Math.max(2, Math.round(((b.dur || 110) + 10) / VAGA)) : b.dur >= 50 ? 2 : 1;
  }
  function horaEmMinutos(h) {
    const [a, b] = String(h).split(':').map(Number);
    return (a || 0) * 60 + (b || 0);
  }
  function minutosEmHora(m) {
    const t = Math.min(23 * 60 + 59, m);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  /**
   * Perdeu dias? Os blocos não feitos com data antes de `hoje` vão para as próximas vagas livres
   * (sem mexer nos fixos nem nos já feitos, no máximo 2 da mesma matéria por dia). O que não couber
   * até a véspera sai, começando pelas revisões. Devolve { blocos, movidos, fora }.
   */
  function redistribuir(params, blocosAtuais, hoje) {
    const atrasados = blocosAtuais.filter((b) => !b.feito && !b.fixo && b.data < hoje);
    if (!atrasados.length) return { blocos: blocosAtuais, movidos: 0, fora: [] };
    const ficam = blocosAtuais.filter((b) => !atrasados.includes(b));
    const ultimo = somarDias(params.objetivo.data, -1);
    const fimPlano = ficam.reduce((a, b) => (b.data > a ? b.data : a), hoje);
    const ate = fimPlano < ultimo ? fimPlano : ultimo;
    const fila = [...atrasados].sort((a, b) => (a.tipo === 'revisao') - (b.tipo === 'revisao') || (a.data < b.data ? -1 : 1));
    // o plano costuma usar todo o tempo livre: abre espaço tirando revisões futuras (espalhadas), nunca fixos nem feitos
    const livreTotal = () => {
      let t = 0;
      for (let iso = hoje; iso <= ate; iso = somarDias(iso, 1)) t += Math.max(0, vagasDoDia(params, iso) - ficam.filter((b) => b.data === iso).reduce((a, b) => a + vagasDoBloco(b), 0));
      return t;
    };
    const precisa = fila.filter((b) => b.tipo !== 'revisao').reduce((a, b) => a + (b.tipo === 'simulado' ? vagasDoBloco(b) : 1), 0); // cada atrasado cabe em meia hora, se precisar
    let falta = precisa - livreTotal();
    const revisoes = ficam.filter((b) => b.tipo === 'revisao' && !b.feito && !b.fixo && b.data >= hoje);
    const passo = Math.max(1, Math.floor(revisoes.length / Math.max(1, falta)));
    const tiradas = [];
    for (let i = revisoes.length - 1; i >= 0 && falta > 0; i -= passo) {
      tiradas.push(revisoes[i]);
      falta -= 1;
    }
    tiradas.forEach((b) => ficam.splice(ficam.indexOf(b), 1));
    const movidos = [];
    for (let iso = hoje; iso <= ate && fila.length; iso = somarDias(iso, 1)) {
      const doDia = ficam.filter((b) => b.data === iso);
      let livres = vagasDoDia(params, iso) - doDia.reduce((a, b) => a + vagasDoBloco(b), 0);
      const noDia = {};
      doDia.forEach((b) => { if (b.materia) noDia[b.materia] = (noDia[b.materia] || 0) + 1; });
      for (let i = 0; i < fila.length && livres > 0;) {
        const b = fila[i];
        // bloco de 50 que só acha meia vaga vira bloco de 25 (melhor estudar um pouco do que nada)
        const encurta = b.tipo !== 'simulado' && vagasDoBloco(b) === 2 && livres === 1;
        const precisa = encurta ? 1 : vagasDoBloco(b);
        if (precisa <= livres && (!b.materia || (noDia[b.materia] || 0) < 2)) {
          fila.splice(i, 1);
          const novo = { ...b, data: iso, movido: true, ...(encurta ? { dur: 25 } : {}) };
          ficam.push(novo);
          movidos.push(novo);
          livres -= precisa;
          if (b.materia) noDia[b.materia] = (noDia[b.materia] || 0) + 1;
        } else i++;
      }
    }
    // reordena e refaz o horário de cada dia
    const porDia = {};
    ficam.forEach((b) => (porDia[b.data] = porDia[b.data] || []).push(b));
    const peso = { simulado: 0, conteudo: 1, redacao: 2, revisao: 3 };
    Object.values(porDia).forEach((lista) => {
      lista.sort((a, b) => (a.fixo === b.fixo ? 0 : a.fixo ? -1 : 1) || peso[a.tipo] - peso[b.tipo] || a.ordem - b.ordem);
      const arrumada = intercalar(lista);
      lista.splice(0, lista.length, ...arrumada);
      let minuto = horaEmMinutos(params.tempo.hora || '19:00');
      lista.forEach((b, i) => {
        b.ordem = i;
        b.hora = minutosEmHora(minuto);
        minuto += (b.dur || 25) + (b.dur >= 50 ? 10 : 5);
      });
    });
    ficam.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem));
    return { blocos: ficam, movidos: movidos.length, fora: [...fila, ...tiradas] };
  }

  /** Resumo do plano: minutos por matéria (conteúdo + revisão) e por tipo. */
  function resumo(blocos) {
    const porMateria = {};
    const porTipo = { conteudo: 0, revisao: 0, simulado: 0, redacao: 0 };
    blocos.forEach((b) => {
      porTipo[b.tipo] = (porTipo[b.tipo] || 0) + (b.dur || 0);
      if (b.materia && b.tipo !== 'redacao') porMateria[b.materia] = (porMateria[b.materia] || 0) + (b.dur || 0);
    });
    return { porMateria, porTipo, total: Object.values(porTipo).reduce((a, b) => a + b, 0) };
  }

  return { DISCIPLINAS, PESO_ESCOLHIDO, VAGA, SEMANAS_MAX, RETA_FINAL, disciplina, pesos, gerar, redistribuir, resumo, titulo, somarDias, diasEntre, vagasDoBloco };
})();
