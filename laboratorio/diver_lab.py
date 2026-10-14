# diver_lab.py — roda o programa do aluno dentro do Pyodide (laboratórios do Explora Tech, 2026-10-13).
#
# Usado pelo python-worker.js (no navegador) e pelo scripts/conferir-laboratorios.mjs (no Node):
# o mesmo código, então a saída conferida é a mesma que o aluno vê.
#  - input() vira "replay": se o programa pede uma entrada que ainda não foi dada, ele para com
#    precisa_entrada=True; o laboratório pergunta no console e roda de novo do começo com a nova resposta.
#  - Saída limitada (laço infinito com print não enche a memória); o tempo limite fica com quem chama
#    (o worker é encerrado de fora).
#  - Arquivos: cada execução começa numa pasta /home/aluno limpa, com os arquivos da missão.
#  - Testes: "assert" (código Python rodado depois do programa) e "saida" (entradas → saída esperada).
#  - Rastreio (Lupa do Código): linha a linha, com as variáveis do programa e a pilha de chamadas.
import sys, os, io, json, random, shutil, traceback, builtins, keyword

PASTA = '/home/aluno'
NOME = 'programa.py'
LIMITE_SAIDA = 50_000      # caracteres
LIMITE_PASSOS = 3_000      # passos do rastreio


class _PedeEntrada(BaseException):
    pass


class _SaidaGrande(BaseException):
    pass


class _Saida(io.TextIOBase):
    def __init__(self):
        self.partes = []
        self.tamanho = 0

    def write(self, s):
        s = str(s)
        self.tamanho += len(s)
        if self.tamanho > LIMITE_SAIDA:
            raise _SaidaGrande()
        self.partes.append(s)
        return len(s)

    def texto(self):
        return ''.join(self.partes)


def _preparar_pasta(arquivos):
    os.chdir('/')  # não dá para apagar a pasta em que o programa está
    if os.path.isdir(PASTA):
        shutil.rmtree(PASTA)
    os.makedirs(PASTA, exist_ok=True)
    for caminho, conteudo in (arquivos or {}).items():
        destino = os.path.join(PASTA, caminho)
        if caminho.endswith('/'):
            os.makedirs(destino, exist_ok=True)
            continue
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, 'w', encoding='utf-8') as f:
            f.write(conteudo)
    os.chdir(PASTA)


def _foto_pasta():
    foto = {}
    for raiz, pastas, nomes in os.walk(PASTA):
        rel = os.path.relpath(raiz, PASTA)
        rel = '' if rel == '.' else rel + '/'
        for p in sorted(pastas):
            foto[rel + p + '/'] = None
        for n in sorted(nomes):
            try:
                with open(os.path.join(raiz, n), encoding='utf-8') as f:
                    foto[rel + n] = f.read(2000)
            except Exception:
                foto[rel + n] = ''
    return foto


def _erro(e, codigo):
    """O erro como o Python mostra, mais o tipo, a mensagem e a linha do programa do aluno."""
    linha = None
    if isinstance(e, SyntaxError) and e.filename == NOME:
        linha = e.lineno
    tb = e.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == NOME:
            linha = tb.tb_lineno
        tb = tb.tb_next
    texto = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
    # tira do traceback as linhas internas do laboratório: o aluno vê só o programa dele
    linhas, pular = [], False
    for l in texto.splitlines():
        if l.startswith('  File "') and NOME not in l:
            pular = True
            continue
        if pular and l.startswith('    '):
            continue
        pular = False
        linhas.append(l)
    return {
        'tipo': type(e).__name__,
        'mensagem': str(e),
        'linha': linha,
        'traceback': '\n'.join(linhas),
    }


def _valor(v):
    try:
        r = repr(v)
    except Exception:
        r = '?'
    if len(r) > 120:
        r = r[:117] + '...'
    return {'tipo': type(v).__name__, 'valor': r}


def _variaveis(loc):
    return {k: _valor(v) for k, v in list(loc.items())
            if not k.startswith('_') and k not in ('input',) and not callable(v) and type(v).__name__ != 'module'}


def _rodar(codigo, entradas, prelude, semente, rastrear, ns):
    fila = list(entradas or [])
    usadas = []
    saida = _Saida()
    passos = []

    def _input(prompt=''):
        saida.write(str(prompt))
        if not fila:
            raise _PedeEntrada(str(prompt))
        v = str(fila.pop(0))
        usadas.append(v)
        saida.write(v + '\n')
        return v

    ns.update({'__name__': '__main__', '__builtins__': builtins, 'input': _input})
    random.seed(semente)
    antigo = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = saida

    def _rastro(frame, evento, arg):
        if frame.f_code.co_filename != NOME:
            return None
        if evento == 'line':
            if len(passos) >= LIMITE_PASSOS:
                raise _SaidaGrande()
            pilha, f = [], frame
            while f is not None and f.f_code.co_filename == NOME:
                pilha.append(f.f_code.co_name if f.f_code.co_name != '<module>' else 'programa')
                f = f.f_back
            loc = frame.f_locals if frame.f_code.co_name != '<module>' else ns
            passos.append({'linha': frame.f_lineno, 'pilha': list(reversed(pilha)), 'variaveis': _variaveis(loc), 'saida': len(saida.texto())})
        return _rastro

    resultado = {'ok': True, 'erro': None, 'precisaEntrada': False, 'prompt': None}
    try:
        if prelude:
            exec(compile(prelude, '<laboratorio>', 'exec'), ns)
        objeto = compile(codigo, NOME, 'exec')
        if rastrear:
            sys.settrace(_rastro)
        try:
            exec(objeto, ns)
        finally:
            sys.settrace(None)
        if rastrear:  # o estado depois da última linha (a Lupa mostra o "depois" de cada linha)
            passos.append({'linha': None, 'pilha': [], 'variaveis': _variaveis(ns), 'saida': len(saida.texto())})
    except _PedeEntrada as e:
        resultado.update(ok=False, precisaEntrada=True, prompt=str(e))
    except _SaidaGrande:
        resultado.update(ok=False, erro={'tipo': 'SaidaGrande', 'mensagem': 'saída ou passos demais', 'linha': None, 'traceback': ''})
    except SystemExit:
        pass
    except BaseException as e:  # o aluno vê qualquer erro do programa dele
        resultado.update(ok=False, erro=_erro(e, codigo))
    finally:
        sys.stdout, sys.stderr = antigo
    resultado.update(saida=saida.texto(), entradasUsadas=usadas, passos=passos if rastrear else None)
    return resultado


def executar(pedido_json):
    """pedido: { codigo, entradas, prelude, arquivos, testes, semente, rastrear } → resultado (JSON)."""
    p = json.loads(pedido_json)
    _preparar_pasta(p.get('arquivos'))
    ns = {}
    r = _rodar(p.get('codigo', ''), p.get('entradas'), p.get('prelude'), p.get('semente', 7), p.get('rastrear', False), ns)
    # eventos que o prelude do laboratório registra (ex.: os passos do robô)
    r['eventos'] = ns.get('_diver_eventos', None)
    r['arquivos'] = _foto_pasta() if p.get('verArquivos') else None
    testes = []
    if not r['precisaEntrada']:
        # primeiro os de "assert" (usam o estado deixado pelo programa), depois os de "saida" (rodam de novo do zero)
        todos = p.get('testes') or []
        for t in [t for t in todos if t.get('tipo') != 'saida'] + [t for t in todos if t.get('tipo') == 'saida']:
            testes.append(_testar(t, p, ns if r['ok'] else None))
    r['testes'] = testes
    try:
        return json.dumps(r, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({'ok': False, 'erro': {'tipo': 'ErroInterno', 'mensagem': str(e), 'linha': None, 'traceback': ''}, 'saida': '', 'testes': []})


def _testar(t, p, ns):
    nome = t.get('nome', 'teste')
    base = {'nome': nome, 'oculto': bool(t.get('oculto'))}
    try:
        if t.get('tipo') == 'saida':
            _preparar_pasta(p.get('arquivos'))
            novo = {}
            r = _rodar(p.get('codigo', ''), t.get('entradas'), p.get('prelude'), p.get('semente', 7), False, novo)
            obtida = r['saida']  # o que o aluno vê no console: prompts, entradas digitadas e prints
            esperada = t.get('esperada', '')
            passou = r['ok'] and obtida.rstrip() == esperada.rstrip()
            return {**base, 'passou': passou, 'obtida': obtida, 'esperada': esperada,
                    'erro': r['erro'], 'mensagem': '' if passou else (t.get('dica') or 'A saída não ficou igual à esperada.')}
        if ns is None:
            return {**base, 'passou': False, 'mensagem': 'O programa parou com erro antes do teste.'}
        saida = _Saida()
        antigo = sys.stdout
        sys.stdout = saida
        try:
            exec(compile(t.get('codigo', ''), '<teste>', 'exec'), ns)
        finally:
            sys.stdout = antigo
        return {**base, 'passou': True, 'mensagem': ''}
    except AssertionError as e:
        return {**base, 'passou': False, 'mensagem': str(e) or t.get('dica') or 'O teste não passou.'}
    except BaseException as e:
        return {**base, 'passou': False, 'mensagem': f'{type(e).__name__}: {e}'}


def travar():
    """Depois de pronto: o programa do aluno não acessa o JavaScript (rede, armazenamento)."""
    for nome in ('js', 'pyodide_js', 'pyodide.http', 'pyodide.ffi', 'micropip'):
        sys.modules[nome] = None
