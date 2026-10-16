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
 *   campos: [{ id, rotulo, caminho: "aparelho.gateway", tipo: "texto" | "escolha", opcoes?, certo?, erro?,
 *             efeitos?: { opção: { caminho: valor } } }]
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
    (m.campos || []).forEach((c) => {
      if (c.caminho) por(cen, c.caminho, valores[c.id]);
      // "efeitos": uma escolha que muda várias coisas (ex.: http:// muda o protocolo e a porta)
      Object.entries((c.efeitos || {})[valores[c.id]] || {}).forEach(([caminho, v]) => por(cen, caminho, v));
    });
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
    if (ped.protocolo && servico !== ped.protocolo && ['HTTP', 'HTTPS'].includes(servico) && ['HTTP', 'HTTPS'].includes(ped.protocolo)) {
      return falha('servidor', `Na porta ${ped.porta}, ${srv.nome} fala ${servico}, e o pedido chegou em ${ped.protocolo}: os dois não se entendem.`, 'servidor', 'servidor', 'transporte');
    }
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

  /* ---------- Terminal do Laboratório de Rede: ipconfig, ping, traceroute, nslookup, nc ---------- */
  /*
   * O cenário pode trazer "falhas": { provedorFora, dnsFora, saltoLento: n (o salto onde o tempo dispara),
   * portaFechada: 443 }, "saltos" (IPs do caminho na internet) e "latencia" (ms até o servidor).
   */
  const AJUDA = 'Comandos: ipconfig · ping <destino> · traceroute <destino> (ou tracert) · nslookup <nome> [servidor] · nc -zv <destino> <porta> · limpar';
  function terminal(cen, linha) {
    const t = String(linha || '').trim().split(/\s+/).filter(Boolean);
    if (!t.length) return { texto: '', comando: '' };
    const cmd = t[0].toLowerCase();
    const ap = cen.aparelho || {};
    const falhas = cen.falhas || {};
    const tabela = (ip) => (cen.resolvedores || {})[ip];
    const vizinhoIp = (ip) => ip === (cen.roteador || {}).interno || (cen.vizinhos || []).some((v) => v.ip === ip);
    const servidor = (ip) => (cen.servidores || []).find((x) => x.ip === ip);
    function resolver(alvo) {
      if (ipNum(alvo) !== null) return { ip: alvo };
      if (falhas.dnsFora || !tabela(ap.dns)) return { erro: 'dns' };
      const ip = tabela(ap.dns)[alvo];
      return ip ? { ip } : { erro: 'nx' };
    }
    const latencia = (ip) => (servidor(ip) && servidor(ip).latencia) || cen.latencia || 18;
    const alcanca = (ip) => (vizinhoIp(ip) ? 'local' : falhas.provedorFora ? 'fora' : servidor(ip) ? 'ok' : 'ninguem');

    if (cmd === 'ajuda' || cmd === 'help') return { texto: AJUDA, comando: 'ajuda' };
    if (['ipconfig', 'ifconfig', 'ip'].includes(cmd)) {
      return { comando: 'ipconfig', texto: [`${ap.nome || 'Este computador'}`, `  Endereço IP . . . . : ${ap.ip}`, `  Máscara . . . . . . : ${ap.mascara}`, `  Gateway padrão . . : ${ap.gateway}`, `  Servidor DNS . . . : ${ap.dns}`].join('\n') };
    }
    if (cmd === 'ping') {
      const alvo = t.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x)).slice(1)[0] || t[t.length - 1];
      if (t.length < 2) return { comando: 'ping', texto: 'Uso: ping <destino>' };
      const r = resolver(alvo);
      if (r.erro) return { comando: 'ping', texto: `ping: ${alvo}: Nome ou serviço desconhecido` };
      const onde = alcanca(r.ip);
      const linhas = [`PING ${alvo}${alvo !== r.ip ? ` (${r.ip})` : ''}: 4 pacotes`];
      let recebidos = 0; let soma = 0;
      [0, 2, 1, 3].forEach((d, i) => {
        const srv = servidor(r.ip);
        const responde = onde === 'local' || (onde === 'ok' && !(srv && srv.semPing));
        if (!responde) { linhas.push(`Tempo esgotado (eco ${i + 1})`); return; }
        const ms = onde === 'local' ? [2, 1, 3, 2][i] : latencia(r.ip) + d + (falhas.saltoLento ? 200 : 0);
        recebidos++; soma += ms;
        linhas.push(`Resposta de ${r.ip}: eco ${i + 1}, tempo=${ms} ms`);
      });
      linhas.push(`--- ${alvo}: 4 enviados, ${recebidos} recebidos, ${Math.round((1 - recebidos / 4) * 100)}% de perda${recebidos ? `, tempo médio ${(soma / recebidos).toFixed(1)} ms` : ''}`);
      return { comando: 'ping', texto: linhas.join('\n') };
    }
    if (cmd === 'traceroute' || cmd === 'tracert') {
      const alvo = t[1];
      if (!alvo) return { comando: 'traceroute', texto: `Uso: ${cmd} <destino>` };
      const r = resolver(alvo);
      if (r.erro) return { comando: 'traceroute', texto: `${cmd}: ${alvo}: Nome ou serviço desconhecido` };
      if (vizinhoIp(r.ip)) return { comando: 'traceroute', texto: ` 1  ${r.ip}  1 ms` };
      const saltos = [(cen.roteador || {}).interno, ...(cen.saltos || ['100.64.0.1', '200.160.0.1', '200.160.1.9']), r.ip];
      const base = [1, 8, 12, 15];
      const linhas = [`Rota até ${alvo}${alvo !== r.ip ? ` (${r.ip})` : ''}, no máximo 30 saltos:`];
      for (let i = 0; i < saltos.length; i++) {
        const n = i + 1;
        if (falhas.provedorFora && i >= 1) { linhas.push(` ${n}  * * *`); if (i >= 3) { linhas.push('(o caminho para de responder depois do salto 1)'); break; } continue; }
        if ((cen.calados || []).includes(n)) { linhas.push(` ${n}  * * *`); continue; }
        if (i === saltos.length - 1 && !servidor(r.ip)) { linhas.push(` ${n}  * * *`); continue; }
        let ms = i < saltos.length - 1 ? base[Math.min(i, base.length - 1)] + i : latencia(r.ip);
        if (falhas.saltoLento && n >= falhas.saltoLento) ms += 200;
        linhas.push(` ${n}  ${saltos[i]}  ${ms} ms`);
      }
      return { comando: 'traceroute', texto: linhas.join('\n') };
    }
    if (cmd === 'nslookup') {
      const nome = t[1];
      if (!nome) return { comando: 'nslookup', texto: 'Uso: nslookup <nome> [servidor]' };
      const srvDns = t[2] || ap.dns;
      const cab = `Servidor: ${srvDns}`;
      if ((falhas.dnsFora && srvDns === ap.dns) || !tabela(srvDns)) return { comando: 'nslookup', texto: `${cab}\n;; tempo esgotado: nenhum servidor DNS respondeu` };
      const ip = tabela(srvDns)[nome];
      return { comando: 'nslookup', texto: ip ? `${cab}\nNome: ${nome}\nEndereço: ${ip}` : `${cab}\n** ${srvDns} não encontrou ${nome}: NXDOMAIN` };
    }
    if (cmd === 'nc') {
      const args = t.slice(1).filter((x) => !x.startsWith('-'));
      if (args.length < 2) return { comando: 'nc', texto: 'Uso: nc -zv <destino> <porta>' };
      const [alvo, porta] = args;
      const r = resolver(alvo);
      if (r.erro) return { comando: 'nc', texto: `nc: ${alvo}: Nome ou serviço desconhecido` };
      const onde = alcanca(r.ip);
      if (onde === 'fora' || onde === 'ninguem') return { comando: 'nc', texto: `nc: conexão com ${alvo} porta ${porta}: tempo esgotado` };
      const srv = servidor(r.ip);
      const aberta = srv && srv.portas && srv.portas[porta] && String(falhas.portaFechada) !== String(porta);
      return { comando: 'nc', texto: aberta ? `Conexão com ${alvo} porta ${porta} [tcp] bem-sucedida!` : `nc: conexão com ${alvo} porta ${porta} recusada` };
    }
    return { comando: '', texto: `${t[0]}: comando não encontrado. Digite ajuda.` };
  }

  /** Laboratório de Rede: confere as conclusões e os comandos exigidos. { ok, mensagem, falta } */
  function conferirTerminal(m, usados, valores) {
    const faltam = (m.exigir || []).filter((c) => !usados.includes(c));
    if (faltam.length) return { ok: false, mensagem: `Antes de responder, investigue com: ${faltam.join(', ')}.` };
    for (const c of m.campos || []) {
      const certos = [].concat(c.certo).map(normal);
      if (!certos.includes(normal(valores[c.id]))) return { ok: false, mensagem: valores[c.id] ? c.erro || 'Ainda não é essa a conclusão.' : `Responda: ${c.rotulo}` };
    }
    return { ok: true, mensagem: m.sucesso || 'Diagnóstico certo.' };
  }

  function verificarTerminal(m) {
    const erros = [];
    if (!m.cenario) return ['falta o cenário'];
    if (!Array.isArray(m.campos) || !m.campos.length) erros.push('falta a pergunta da conclusão');
    (m.campos || []).forEach((c) => { if (c.certo === undefined) erros.push(`campo ${c.id} sem "certo"`); if (c.opcoes && !c.opcoes.includes(c.certo)) erros.push(`campo ${c.id}: a certa não está entre as opções`); });
    const sol = m.solucao || {};
    const usados = [];
    (sol.comandos || []).forEach((l) => {
      const r = terminal(m.cenario, l);
      if (!r.comando || /^Uso:/.test(r.texto)) erros.push(`o comando "${l}" não é reconhecido`);
      usados.push(r.comando);
    });
    (m.exigir || []).forEach((c) => { if (!usados.includes(c)) erros.push(`a solução não usa ${c}, que a missão exige`); });
    if (!conferirTerminal(m, usados, sol.resposta || {}).ok) erros.push('a resposta da solução não confere');
    if (conferirTerminal(m, [], {}).ok) erros.push('a missão já começa resolvida');
    if (!m.metas || !m.metas.comandos) erros.push('falta metas.comandos');
    else if ((sol.comandos || []).length > m.metas.comandos) erros.push(`a solução usa ${sol.comandos.length} comandos e a meta é ${m.metas.comandos}`);
    return erros;
  }

  return { ipNum, numIp, mascaraBits, naRede, privado, iniciais, simular, conferir, verificar, pegar, terminal, conferirTerminal, verificarTerminal, AJUDA };
})();
