# Parecer: Mapa das Profissões, kit v5 (onda 2), 2026-10-19

- **Tipo:** 3 fichas novas (Agronomia, Engenharia de Segurança do Trabalho, Serviço Social), 6 fichas atualizadas (Psicologia, Fisioterapia, Nutrição, Biomedicina, Direito, Engenharia de Produção) e 2 panoramas novos (Marketing Digital; Finanças, Gestão e Negócios). Tudo veio do kit do Mapa das Profissões v5 (enviado pelo usuário em 19/10/2026), pesquisado com fonte e data em cada número.
- **Resultado:** **Aprovada com ressalvas.** Tudo entra como `rascunho`: o aluno vê "Em breve" até a revisão de um profissional de cada área e o OK do usuário.

Nenhum texto das fontes foi copiado; os números estão nas fichas com a fonte de cada um.

## 1. O que ficou de fora do kit

| Arquivo do kit | Por quê |
|---|---|
| `js/`, `css/`, `profissoes.html` | O app já tem a versão evoluída (formato de relatório, ícones, palpite); o kit é a referência antiga |
| `data/profissoes/medicina.json` | É o panorama da Medicina (no app, `panorama-medicina.json`); por cima, apagaria a ficha de Medicina |
| `biologia.json` | A nossa tem as três correções conferidas na fonte oficial (parecer de 18/10/2026) |
| `enfermagem.json` | Só muda com o OK do usuário; o kit não traz nada novo |
| `tecnologia.json` | A nossa já tem os ajustes da repaginação (rótulos, nomes curtos, textos do jogo) |

## 2. Achados

1. **Biomedicina (corrigido):** a nossa frase-tese dizia "Faz o exame, mas não dá o laudo". O kit, com a Lei 6.684/1979 e o manual do CRBM-1, diz que o biomédico assina o laudo técnico dos exames de laboratório. A frase-tese foi reescrita ("Os exames por trás do diagnóstico").
2. **Frases-tese que citavam fontes que o kit não tem (corrigido):** Nutrição e Direito (dado do Sisu), Biomedicina (Lei do Ato Médico), Engenharia de Produção (ART) e Fisioterapia (Portaria 378). Cada uma foi reescrita só com fatos e fontes que estão na ficha nova.
3. **Salário antes do palpite (corrigido):** na capa do Panorama do Marketing, uma linha dava a média de contratação e um destaque dava a renda dos criadores em reais; os dois foram reescritos sem valor. A bolsa de residência em reais, que o kit pôs em "Outros caminhos" de Psicologia, Fisioterapia e Nutrição, agora fica "R$ ?" até o palpite (`js/profissoes.js`).
4. **Exame de Ordem (confere, secundária):** 15,8% dos inscritos aprovados na 43ª edição (23.031 de 145.983), em levantamentos de cursinhos com os números da FGV. Trocar pela estatística oficial do CFOAB/FGV na revisão.
5. **Exame de Suficiência do CFC (confere, secundária):** 27,30% de aprovação nacional na 1ª edição de 2026 (12.614 de 42.535 presentes), segundo o CRC-MS. Conferir no CFC.
6. **Certificações da Anbima (ressalva):** a fonte do kit é o comunicado da própria Anbima (21/01/2026), com a troca de CPA-10, CPA-20 e CEA por CPA, C-Pro R e C-Pro I a partir de 19/02/2026; guias de mercado falam em 26/01/2026. Conferir a data no site da Anbima.
7. **Fontes-espelho (ressalva, do próprio kit):** leis, decretos e resoluções lidos em cópias (ABMES, Normas Brasil, UFRRJ, Legisweb, IFPB) porque os portais oficiais bloquearam o acesso automático. Trocar pelas URLs do Planalto, do MEC e dos conselhos; as pendências estão na `nota` de cada fonte.
8. **Enquadramento no decreto do EAD (ressalva, do kit):** Serviço Social, Fisioterapia e Nutrição como "área de saúde" do art. 9º do Decreto 12.456/2025 precisa de confirmação oficial.
9. **Ajustes de formato (nota):** as matérias-chave foram ligadas aos cursos do Diver (`enem-<matéria>`); as características (`tags`) seguem os filtros do mapa; o título da CNE/CES 2/2007, da CNE/CES 4/2009 e do Decreto 12.456/2025 ficou igual ao das outras fichas; a bolsa de residência de Fisioterapia (Santa Casa) ganhou id próprio.

## 3. Para os especialistas

- Engenheiro(a) agrônomo(a), engenheiro(a) de segurança do trabalho e assistente social: as fichas novas inteiras, as cenas e o "Agora, às Xh".
- Profissionais de marketing e de finanças, gestão e negócios: as rotinas das 9 e das 10 áreas e os jogos.
- Psicólogo(a), fisioterapeuta, nutricionista, biomédico(a), advogado(a) e engenheiro(a) de produção: as fichas atualizadas.

## 4. Decisão

Pode entrar no app como `rascunho`. Publicar só depois da revisão de cada profissional (`revisao.profissional: ok`, com nome e data) e do OK do usuário.
