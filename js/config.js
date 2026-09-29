/*
 * config.js — liga o Diver ao Supabase (login, alunos, cursos e progresso na nuvem).
 *
 * Dois ambientes, escolhidos pelo ENDEREÇO do site (guia: docs/AMBIENTES.md):
 *  - produção: allissondella.github.io (GitHub Pages) → Supabase dos alunos de verdade
 *  - testes:   qualquer outro endereço (site de testes, prévias dos PRs, localhost) → Supabase de testes,
 *              com a faixa "AMBIENTE DE TESTES" no topo. Sem os valores de testes, roda no "modo local".
 *
 * Os valores abaixo são PÚBLICOS por natureza: a "Project URL" e a chave "anon" (ou "publishable")
 * foram feitas para ficar no site. Quem protege os dados são as regras do banco (supabase/setup.sql).
 * NUNCA coloque aqui a chave "service_role" / "secret".
 */
(function () {
  var ENDERECOS_DE_PRODUCAO = ['allissondella.github.io']; // domínio próprio no futuro? acrescente aqui

  var AMBIENTES = {
    producao: {
      supabaseUrl: 'https://bdrwqmxjhvxqwfywpikg.supabase.co',
      supabaseChave: 'sb_publishable_UyTo6L5wYVtPpnmJBndD7g_zBhf4NO-',
    },
    testes: {
      supabaseUrl: '', // Project URL do Supabase de TESTES
      supabaseChave: '', // chave publishable do Supabase de TESTES
    },
  };

  var nome = ENDERECOS_DE_PRODUCAO.indexOf(location.hostname) >= 0 ? 'producao' : 'testes';
  window.DIVER_CONFIG = {
    ambiente: nome,
    supabaseUrl: AMBIENTES[nome].supabaseUrl,
    supabaseChave: AMBIENTES[nome].supabaseChave,
  };
})();
