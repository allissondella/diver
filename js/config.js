/*
 * config.js — liga o Diver ao Supabase (login, alunos, cursos e progresso na nuvem).
 *
 * Os dois valores abaixo são PÚBLICOS por natureza: a "Project URL" e a chave
 * "anon" (ou "publishable") foram feitas para ficar no site. Quem protege os dados
 * são as regras do banco (supabase/setup.sql).
 * NUNCA coloque aqui a chave "service_role" / "secret".
 *
 * Com os dois vazios, o Diver funciona no "modo local": sem login, tudo no navegador.
 */
window.DIVER_CONFIG = {
  supabaseUrl: 'https://bdrwqmxjhvxqwfywpikg.supabase.co',
  supabaseChave: 'sb_publishable_UyTo6L5wYVtPpnmJBndD7g_zBhf4NO-',
};
