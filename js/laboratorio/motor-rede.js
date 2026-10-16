/*
 * laboratorio/motor-rede.js — a rede simulada da Jornada do Pacote (Explora Tech, Módulos 9 e 10, 2026-10-16).
 * Só lógica, sem tela: o mesmo arquivo roda no navegador e no scripts/conferir-laboratorios.mjs (Node).
 * Também serve ao Laboratório de Rede (ping, traceroute, nslookup).
 *
 * Uma missão traz um cenário e os campos que o aluno mexe (data/laboratorios/<curso>/jornada-do-pacote.json):
 *   cenario: {
 *     aparelho: { nome, ip, mascara, gateway, dns },
 *     redeLocal: "192.168.0.0/24", vizinhos: [{ nome, ip, dns? }],
 *     roteador: { interno, publico, firewall?: { regras: [{ porta, acao }], padrao } },
 *     provedor: "nome", resolvedores: { "ip": { nome: ip } }, (DNS que o roteador e os públicos conhecem)
 *     servidores: [{ nome, ip, portas: { "443": "HTTPS" }, certificado?: { nome, confiavel }, falso? }],
 *     pedido: { nome?, ip?, porta, protocolo, senha?, mensagem }
 *   }
 *   campos: [{ id, rotulo, caminho: "aparelho.gateway", tipo: "texto" | "escolha", opcoes?, certo?, erro? }]
 *   solucao: { idDoCampo: valor }, metas: { envios }
 * simular(m, valores) devolve { passos: [{ de, para, camada, texto, ok }], entregue, motivo, onde }.
 * Campos com "certo" (perguntas da missão, como a ordem das camadas) são conferidos antes da viagem.
 */
const MotorRede = (() => {
  /* ---------- Endereços (IPv4) ---------- */
  function ipNum(ip) {
    const p = String(ip || '').trim().split('.');
    if (p.length !== 4 || !p.every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255)) return null;
    return p.reduce((n, x) => n * 256 + Number(x), 0);
  }
  const numIp = (n) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
  function mascaraBits(m) {
    const s = String(m || '').trim();
    if (/^\/?\d{1,2}$/.test(s)) { const b = Number(s.replace('/', '')); return b <= 32 ? b : null; }
    const n = ipNum(s);
    if (n === null) return null;
    const bin = n.toString(2).padStart(32, '0');
    return /^1*0*$/.test(bin) ? bin.indexOf('0') < 0 ? 32 : bin.indexOf('0') : null;
  }
  const base = (ipn, bits) => (bits === 0 ? 0 : Math.floor(ipn / 2 ** (32 - bits)) * 2 ** (32 - bits));
  function naRede(ip, rede, bits) {
    const a = ipNum(ip); const r = ipNum(rede);
    return a !== null && r !== null && base(a, bits) === base(r, bits);
  }
  function redeDe(cidr) { const [ip, b] = String(cidr).split('/'); return { ip, bits: Number(b) }; }
  function privado(ip) {
    const n = ipNum(ip);
    if (n === null) return false;
    return naRede(ip, '10.0.0.0', 8) || naRede(ip, '172.16.0.0', 12) || naRede(ip, '192.168.0.0', 16);
  }

  /* ---------- Campos ---------- */
  const clonar = (x) => JSON.parse(JSON.stringify(x));
  function por(obj, caminho, valor) {
    const partes = caminho.split('.');
    let o = obj;
    partes.slice(0, -1).forEach((p) => { if (!(p in o)) o[p] = {}; o = o[p]; });
    o[partes[partes.length - 1]] = valor;
  }
  function pegar(obj, caminho) { return caminho.split('.').reduce((o, p) => (o == null ? undefined : o[p]), obj); }
  const normal = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
  /** Valores iniciais dos campos: o que está no cenário (ou "valor" do campo). */
  function iniciais(m) {
    const v = {};
    (m.campos || []).forEach((c) => { v[c.id] = c.valor !== undefined ? c.valor : c.caminho ? pegar(m.cenario, c.caminho) : ''; if (v[c.id] == null) v[c.id] = ''; });
    return v;
  }

  /* ---------- A viagem ---------- */
  function simular(m, valores) {
    const passos = [];
    const passo = (de, para, camada, texto, ok = true) => passos.push({ de, para, camada, texto, ok });
    const falha = (onde, motivo, de = onde, para = onde, camada = 'rede') => { passo(de, para, camada, motivo, false); return { passos, entregue: false, motivo, onde }; };

    // perguntas da missão (campos com "certo"): conferidas antes de o pacote sair
    for (const c of m.campos || []) {
      if (c.certo === undefined) continue;
      const certos = [].concat(c.certo).map(normal);
      if (!certos.includes(normal(valores[c.id]))) return falha('aparelho', c.erro || `${c.rotulo}: ainda não está certo.`, 'aparelho', 'aparelho', c.camada || 'aplicação');
    }
    const cen = clonar(m.cenario || {});
    (m.campos || []).forEach((c) => { if (c.caminho) por(cen, c.caminho, valores[c.id]); });
    if (m.semViagem) { (m.passosFinais || []).forEach((p) => passo(p.de, p.para, p.camada, p.texto)); return { passos, entregue: true, motivo: '', onde: 'servidor' }; }

    const ap = cen.aparelho || {};
    const nome = ap.nome || 'Seu aparelho';
    const local = redeDe(cen.redeLocal || '192.168.0.0/24');
    const bits = mascaraBits(ap.mascara);
    // 1. a configuração do aparelho
    if (ipNum(ap.ip) === null) return falha('aparelho', `O IP "${ap.ip}" não é um endereço válido: são quatro números de 0 a 255.`);
    if (bits === null) return falha('aparelho', `A máscara "${ap.mascara}" não é válida.`);
    if (!naRede(ap.ip, local.ip, local.bits)) return falha('aparelho', `O IP ${ap.ip} não pertence à rede da casa (${cen.redeLocal}): o roteador não responde a ele.`);
    const n = ipNum(ap.ip); const b0 = base(n, local.bits);
    if (n === b0 || n === b0 + 2 ** (32 - local.bits) - 1) return falha('aparelho', `${ap.ip} é o endereço da própria rede ou o de difusão: não pode ser de um aparelho.`);
    const ocupado = (cen.vizinhos || []).concat([{ nome: 'Roteador', ip: cen.roteador && cen.roteador.interno }]).find((v) => v.ip === ap.ip);
    if (ocupado) return falha('aparelho', `Conflito de IP: ${ap.ip} já está em uso (${ocupado.nome}).`);
    passo('aparelho', 'aparelho', 'rede', `${nome}: IP ${ap.ip}, máscara ${ap.mascara}, gateway ${ap.gateway || '(vazio)'}, DNS ${ap.dns || '(vazio)'}.`);

    const vizinho = (ip) => (cen.vizinhos || []).find((v) => v.ip === ip) || (cen.roteador && cen.roteador.interno === ip ? { nome: 'Roteador', ip, dns: true, roteador: true } : null);
    const gatewayOk = () => !!(cen.roteador && ap.gateway === cen.roteador.interno);
    /** Próximo salto até o IP: direto (o aparelho acha que é vizinho) ou pelo gateway. */
    function saida(ip, camada) {
      if (naRede(ip, ap.ip, bits)) {
        if (vizinho(ip) && naRede(ip, local.ip, local.bits)) { passo('aparelho', 'aparelho', camada, `${ip} está na mesma rede: vai direto.`); return { direto: true }; }
        if (naRede(ip, local.ip, local.bits)) return { erro: falha('aparelho', `Nenhum aparelho da rede tem o IP ${ip}: o pacote vai direto e ninguém responde.`, 'aparelho', 'aparelho', camada) };
        return { erro: falha('aparelho', `Pela máscara ${ap.mascara}, ${ip} parece vizinho e o pacote vai direto, mas ninguém na rede local tem esse IP. Confira a máscara.`, 'aparelho', 'aparelho', 'internet') };
      }
      if (!ap.gateway) return { erro: falha('aparelho', `${ip} está fora da rede e o gateway está vazio: o pacote não tem por onde sair.`, 'aparelho', 'aparelho', 'internet') };
      if (!naRede(ap.gateway, ap.ip, bits)) return { erro: falha('aparelho', `O gateway ${ap.gateway} está fora da rede do aparelho: ele não consegue entregar o pacote à portaria.`, 'aparelho', 'aparelho', 'internet') };
      if (!gatewayOk()) return { erro: falha('aparelho', `O gateway ${ap.gateway} não é o roteador (${cen.roteador.interno}): o pacote foi para quem não encaminha nada.`, 'aparelho', 'aparelho', 'internet') };
      passo('aparelho', 'roteador', camada, `${ip} está fora da rede: o pacote sai pelo gateway ${ap.gateway}.`);
      return { direto: false };
    }
    /** Do roteador até a internet: NAT e firewall. */
    function atravessar(porta, camada) {
      const fw = cen.roteador && cen.roteador.firewall;
      if (fw) {
        const regra = (fw.regras || []).find((r) => String(r.porta) === String(porta));
        const acao = regra ? regra.acao : fw.padrao || 'permitir';
        if (acao !== 'permitir') return falha('roteador', `Firewall: ${regra ? `a regra da porta ${porta} manda bloquear` : `nenhuma regra fala da porta ${porta}, e o padrão é bloquear`}. Pacote descartado.`, 'roteador', 'roteador', 'transporte');
        passo('roteador', 'roteador', 'transporte', `Firewall: porta ${porta} permitida${regra ? '' : ' pelo padrão'}.`);
      }
      if (privado(ap.ip)) passo('roteador', 'provedor', 'internet', `NAT: a origem ${ap.ip} vira o IP público ${cen.roteador.publico}.`);
      passo('provedor', 'internet', camada, `O provedor${cen.provedor ? ` ${cen.provedor}` : ''} encaminha o pacote pelos roteadores da internet.`);
      return null;
    }

    // 2. o nome vira número
    const ped = cen.pedido || {};
    let destino = ped.ip;
    if (ped.nome) {
      if (!ap.dns) return falha('aparelho', 'O DNS está vazio: o aparelho não tem a quem perguntar o IP do nome.', 'aparelho', 'aparelho', 'aplicação');
      if (ipNum(ap.dns) === null) return falha('aparelho', `O DNS "${ap.dns}" não é um endereço válido.`, 'aparelho', 'aparelho', 'aplicação');
      const tabela = (cen.resolvedores || {})[ap.dns];
      const s = saida(ap.dns, 'aplicação');
      if (s.erro) return s.erro;
      if (s.direto) {
        const v = vizinho(ap.dns);
        if (!v || !v.dns || !tabela) return falha('aparelho', `${ap.dns} (${v ? v.nome : 'endereço da rede'}) não responde perguntas de DNS.`, 'aparelho', 'aparelho', 'aplicação');
      } else {
        const e = atravessar(53, 'aplicação');
        if (e) return e;
        if (!tabela) return falha('internet', `Ninguém responde DNS no endereço ${ap.dns}: a pergunta se perdeu.`, 'internet', 'internet', 'aplicação');
      }
      passo('aparelho', 'dns', 'aplicação', `DNS: qual é o IP de ${ped.nome}?`);
      destino = tabela[ped.nome];
      if (!destino) return falha('dns', `DNS: o nome ${ped.nome} não existe.`, 'dns', 'aparelho', 'aplicação');
      passo('dns', 'aparelho', 'aplicação', `DNS responde: ${ped.nome} é ${destino}.`);
    }
    if (ipNum(destino) === null) return falha('aparelho', `O destino "${destino}" não é um IP válido.`, 'aparelho', 'aparelho', 'internet');

    // 3. a viagem até o servidor
    passo('aparelho', 'aparelho', 'aplicação', `Pedido ${ped.protocolo || 'HTTP'}: ${ped.mensagem || 'GET /'} para ${ped.nome || destino}, porta ${ped.porta}.`);
    if (m.mostrarCamadas) passo('aparelho', 'aparelho', 'transporte', `Encapsulamento: [Wi-Fi [IP ${ap.ip} → ${destino} [TCP porta ${ped.porta} [${ped.protocolo || 'HTTP'}]]]].`);
    const srv = (cen.servidores || []).find((x) => x.ip === destino);
    const s = saida(destino, 'internet');
    if (s.erro) return s.erro;
    if (s.direto && !srv) { const v = vizinho(destino); return falha('aparelho', `${v.nome} recebeu o pedido, mas não guarda a página: quem responde é o servidor.`, 'aparelho', 'aparelho', 'aplicação'); }
    if (!s.direto && srv && srv.interno) passo('roteador', 'servidor', 'internet', `O roteador encaminha para a outra rede interna, onde está ${srv.nome}.`);
    else if (!s.direto) { const e = atravessar(ped.porta, 'internet'); if (e) return e; }
    if (!srv) return falha('internet', `Ninguém responde no IP ${destino}. O pacote se perdeu.`, 'internet', 'internet', 'internet');
    passo(s.direto || srv.interno ? 'roteador' : 'internet', 'servidor', 'internet', `O pacote chega a ${srv.nome} (${srv.ip}).`);
    const servico = (srv.portas || {})[String(ped.porta)];
    if (!servico) return falha('servidor', `A porta ${ped.porta} está fechada em ${srv.nome}: nenhum programa escuta ali. O servidor recusa a conexão.`, 'servidor', 'servidor', 'transporte');
    if (m.mostrarHandshake) {
      passo('aparelho', 'servidor', 'transporte', 'TCP: SYN (quero conversar).');
      passo('servidor', 'aparelho', 'transporte', 'TCP: SYN-ACK (pode falar).');
      passo('aparelho', 'servidor', 'transporte', 'TCP: ACK (combinado). Conexão aberta.');
    }
    if ((ped.protocolo || 'HTTP') === 'HTTPS') {
      const cert = srv.certificado;
      if (!cert || !cert.confiavel) return falha('servidor', `O certificado de ${srv.nome} não foi assinado por uma autoridade confiável. O navegador avisa: conexão não segura.`, 'servidor', 'aparelho', 'aplicação');
      if (ped.nome && cert.nome !== ped.nome) return falha('servidor', `O certificado é de ${cert.nome}, não de ${ped.nome}. O navegador bloqueia: pode ser um site falso.`, 'servidor', 'aparelho', 'aplicação');
      passo('servidor', 'aparelho', 'aplicação', `HTTPS: certificado de ${cert.nome} conferido. Cadeado fechado: daqui em diante, tudo vai cifrado.`);
    } else if (ped.senha) {
      return falha('internet', 'A senha viajou em HTTP, sem cadeado: cada salto do caminho conseguiu ler. Use HTTPS.', 'internet', 'internet', 'aplicação');
    }
    if (srv.falso) return falha('servidor', `${srv.nome} não é o site que você queria: o nome levou a um servidor falso.`, 'servidor', 'aparelho', 'aplicação');
    passo('servidor', 'aparelho', 'aplicação', `${srv.nome} responde: ${srv.resposta || '200 OK, aqui está a página.'}`);
    return { passos, entregue: true, motivo: '', onde: 'servidor' };
  }

  /** Confere: { ok, mensagem, custo } (custo = envios feitos, contado pela tela). */
  function conferir(m, valores, envios = 1) {
    const r = simular(m, valores);
    return r.entregue ? { ok: true, custo: envios, mensagem: m.sucesso || 'O pacote chegou e a resposta voltou.' } : { ok: false, custo: envios, mensagem: r.motivo };
  }

  /** Conferência para o scripts/conferir-laboratorios.mjs: a lista de problemas da missão. */
  function verificar(m) {
    const erros = [];
    if (!Array.isArray(m.campos) || !m.campos.length) erros.push('faltam os campos que o aluno mexe');
    (m.campos || []).forEach((c) => {
      if (!c.id || !c.rotulo) erros.push('campo sem id ou rótulo');
      if (c.tipo === 'escolha' && !(Array.isArray(c.opcoes) && c.opcoes.length >= 2)) erros.push(`campo ${c.id}: escolha precisa de 2 opções ou mais`);
      if (c.tipo === 'escolha' && c.opcoes && new Set(c.opcoes).size !== c.opcoes.length) erros.push(`campo ${c.id}: opções repetidas`);
      if (c.tipo === 'escolha' && m.solucao && !c.opcoes.includes(m.solucao[c.id])) erros.push(`campo ${c.id}: a solução não está entre as opções`);
    });
    if (!m.solucao) return erros.concat('falta a solução');
    const valores = { ...iniciais(m), ...m.solucao };
    const r = simular(m, valores);
    if (!r.entregue) erros.push(`a solução não entrega: ${r.motivo}`);
    if (simular(m, iniciais(m)).entregue) erros.push('a missão já começa resolvida');
    if (!m.metas || !m.metas.envios) erros.push('falta metas.envios');
    return erros;
  }

  return { ipNum, numIp, mascaraBits, naRede, privado, iniciais, simular, conferir, verificar, pegar };
})();
