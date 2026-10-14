# robo.py — o mundo do Robô Entregador (laboratório do Explora Tech, 2026-10-13).
# Roda antes do programa do aluno (prelude): define andar(), virar_esquerda(), virar_direita(),
# pegar(), soltar(), parede_a_frente(), parede_a_direita(), parede_a_esquerda(), caixa_aqui() e
# no_destino() (os sensores entraram com as decisões, Módulo 2, 2026-10-14), e anota cada ação em
# _diver_eventos (o laboratório anima o robô a partir dela). O mesmo mundo existe em JavaScript
# (js/jogos/robo-entregador.js, MundoRobo) para o modo toque; o conferir-laboratorios confere os dois.
import json as _json, sys as _sys

_MAPA = _json.loads(_DIVER_MAPA)
_LIMITE = 400
_DIRS = ['leste', 'sul', 'oeste', 'norte']
_PASSO = {'leste': (1, 0), 'sul': (0, 1), 'oeste': (-1, 0), 'norte': (0, -1)}
_diver_eventos = []


class RoboBateu(Exception):
    pass


class _Robo:
    def __init__(self, linhas, direcao):
        self.paredes, self.caixas, self.destinos = set(), {}, set()
        self.largura, self.altura = max(len(l) for l in linhas), len(linhas)
        for y, l in enumerate(linhas):
            for x, c in enumerate(l):
                if c == '#': self.paredes.add((x, y))
                elif c == 'R': self.x, self.y = x, y
                elif c == 'C': self.caixas[(x, y)] = self.caixas.get((x, y), 0) + 1
                elif c == 'D': self.destinos.add((x, y))
                elif c == 'E':  # caixa já em cima do destino (não conta como pendente)
                    self.destinos.add((x, y)); self.caixas[(x, y)] = 1
        self.dir = direcao
        self.carga = 0
        self.passos = 0

    def bloqueado(self, x, y):
        return (x, y) in self.paredes or not (0 <= x < self.largura and 0 <= y < self.altura)


_r = _Robo(_MAPA['mapa'], _MAPA.get('direcao', 'leste'))


def _linha():
    f = _sys._getframe(2)
    while f is not None and f.f_code.co_filename != 'programa.py':
        f = f.f_back
    return f.f_lineno if f else None


def _acao(nome, ok=True, **extra):
    _r.passos += 1
    _diver_eventos.append({'acao': nome, 'x': _r.x, 'y': _r.y, 'dir': _r.dir, 'carga': _r.carga, 'linha': _linha(), 'ok': ok, **extra})
    if _r.passos > _LIMITE:
        raise RoboBateu(f'O robô cansou: mais de {_LIMITE} ações. Será que tem um laço que não termina?')


def andar():
    dx, dy = _PASSO[_r.dir]
    nx, ny = _r.x + dx, _r.y + dy
    if _r.bloqueado(nx, ny):
        _acao('bater', ok=False)
        raise RoboBateu('O robô bateu na parede. Confira para onde ele está virado antes de andar.')
    _r.x, _r.y = nx, ny
    _acao('andar')


def virar_esquerda():
    _r.dir = _DIRS[(_DIRS.index(_r.dir) - 1) % 4]
    _acao('virar_esquerda')


def virar_direita():
    _r.dir = _DIRS[(_DIRS.index(_r.dir) + 1) % 4]
    _acao('virar_direita')


def pegar():
    if _r.caixas.get((_r.x, _r.y), 0) <= 0:
        _acao('pegar', ok=False)
        raise RoboBateu('Não tem caixa aqui para pegar.')
    if _r.carga >= 1:
        _acao('pegar', ok=False)
        raise RoboBateu('O robô só carrega uma caixa por vez: entregue a primeira antes.')
    _r.caixas[(_r.x, _r.y)] -= 1
    _r.carga += 1
    _acao('pegar')


def soltar():
    if _r.carga <= 0:
        _acao('soltar', ok=False)
        raise RoboBateu('O robô não está carregando nenhuma caixa.')
    _r.carga -= 1
    _r.caixas[(_r.x, _r.y)] = _r.caixas.get((_r.x, _r.y), 0) + 1
    _acao('soltar')


def parede_a_frente():
    dx, dy = _PASSO[_r.dir]
    return _r.bloqueado(_r.x + dx, _r.y + dy)


def parede_a_direita():
    dx, dy = _PASSO[_DIRS[(_DIRS.index(_r.dir) + 1) % 4]]
    return _r.bloqueado(_r.x + dx, _r.y + dy)


def parede_a_esquerda():
    dx, dy = _PASSO[_DIRS[(_DIRS.index(_r.dir) - 1) % 4]]
    return _r.bloqueado(_r.x + dx, _r.y + dy)


def caixa_aqui():
    return _r.caixas.get((_r.x, _r.y), 0) > 0


def no_destino():
    return (_r.x, _r.y) in _r.destinos


def _entregue():
    """Todas as caixas estão em cima de um destino e o robô não está carregando nada."""
    fora = [p for p, n in _r.caixas.items() if n > 0 and p not in _r.destinos]
    vazios = [d for d in _r.destinos if _r.caixas.get(d, 0) <= 0]
    return not fora and not vazios and _r.carga == 0
