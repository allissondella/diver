# Onda 2 do Mapa das Profissões (18/10/2026)

Nesta onda entraram 9 fichas clássicas e 2 panoramas, todos pesquisados com fonte e passando nos conferidores. Tudo em `status: rascunho`, com `revisao.profissional: pendente`.

## Fichas novas (`data/profissoes/<id>.json`)
| Ficha | Área | CBO do salário | Destaque de pesquisa |
|---|---|---|---|
| Psicologia | Saúde | 2515-10 | 612 mil psicólogos (CFP, set/2026); EAD proibido pelo art. 8º do Decreto 12.456; PL 3.086/2024 (30 h e piso) no Senado |
| Fisioterapia | Saúde | 2236-05 | jornada máxima de 30 h por lei (8.856/1994); 4.000 h pela CNE/CES 4/2009 |
| Nutrição | Saúde | 2237-10 | maior empregador é refeição coletiva; prescreve suplementos, não medicamentos |
| Biomedicina | Saúde | 2212-05 | 34 habilitações; estética é juridicamente instável (TRF-1, mar/2026) |
| Direito | Direito e sociedade | 2410-05 | Exame de Ordem aprova ~15%; 1,37 mi de advogados; 3º curso do país |
| Serviço Social | Direito e sociedade | 2516-05 | única profissão superior com 30 h em lei; obrigatória em CRAS/CREAS |
| Agronomia | Engenharia | 2221-10 | piso das engenharias congelado pelo STF (base mar/2022) |
| Engenharia de Produção | Engenharia | 2149-05 | 3.600 h pela DCN 2/2019 |
| Engenharia de Segurança do Trabalho | Engenharia | 2149-15 e 3516-05 | é pós para engenheiros; técnico tem mercado 20x maior (+2.704 vagas) |

## Panoramas novos
- `marketing.json`: 9 áreas (tráfego pago, inbound, growth, conteúdo, SEO, branding, dados de marketing, RP, vendas digitais), 28 fontes, Censo 2024 lido da planilha do Inep (Marketing 108 mil matrículas, 88% EAD). Honesto sobre PJ/freelance e sobre a renda concentrada de criadores.
- `negocios.json`: 10 áreas (planejamento financeiro, finanças corporativas, contabilidade, projetos e ágil, compliance, RH, administração, vendas, empreendedorismo, logística), 33 fontes. Exame CFC 2026 com 27% de aprovação; Anbima trocou CPA-10/20 por CPA e C-Pro em fev/2026; só 41,5% dos MEI chegam a 5 anos (Sebrae).

## O que cada agente deixou em `nota` (resumo)
- URLs oficiais do MEC/CNE, Planalto, Confea, CFESS e cnct.mec.gov.br bloquearam acesso automático; as fontes usam cópias em ABMES, Normas Brasil, UFRRJ, Legisweb, USP. Trocar pelas oficiais na revisão.
- Alguns CBOs do brief estavam trocados; os arquivos usam os corretos conferidos no Portal Salário (ex.: analista de marketing 1423-35, contador 2522-10, auditor 2522-05).
- Enquadramento de Serviço Social, Fisioterapia e Nutrição na "área de saúde" do decreto do EAD (art. 9º) precisa de confirmação oficial.
- Não há matrículas do Censo 2024 para cursos fora do top 10; esses `contexto` usam Caged.

## Cobertura da lista de 30 profissões em alta
Mapeadas: 1–7 (Tecnologia), 8–12 (Marketing), 13 (Enfermagem), 14 (Medicina), 15 (Psicologia), 16 (Fisioterapia), 17 (Biomedicina), 18 (Nutrição), 19–24 (Negócios), 25 (Eng. de Segurança), 26 (Eng. de Produção), 27 (Logística, no panorama de Negócios), 28 (Agronomia), 29 (Direito), 30 (Serviço Social). Faltam fichas próprias de Administração, Contábeis e Gestão de Pessoas (cobertas pelo panorama de Negócios por enquanto).
