-- Dados de demonstração (um estúdio de design e web). Só corre se a base estiver vazia.
-- Os prazos são relativos a hoje, por isso há sempre tarefas atrasadas e a vencer.
DO $$
DECLARE
  r RECORD;
  n INT;
  k INT;
  total NUMERIC;
  dia DATE;
BEGIN
  IF EXISTS (SELECT 1 FROM projetos) THEN
    RETURN;
  END IF;

  INSERT INTO membros (id, nome, funcao, email, cor) VALUES
    (1, 'Marta Silva',  'Designer',            'marta@estudioalfa.pt', '#3b5a7a'),
    (2, 'Rui Costa',    'Programador',         'rui@estudioalfa.pt',   '#24493c'),
    (3, 'Inês Matos',   'Gestora de projetos', 'ines@estudioalfa.pt',  '#8a5a14'),
    (4, 'Tiago Neves',  'Copywriter',          'tiago@estudioalfa.pt', '#6b4f7a');
  PERFORM setval('membros_id_seq', 4);

  INSERT INTO projetos (id, nome, cliente, descricao, estado, prazo, cor) VALUES
    (1, 'Website Padaria Dourada', 'Padaria Dourada',
        'Site novo com catálogo de produtos e formulário de encomendas.',
        'ativo', CURRENT_DATE + 18, '#8a5a14'),
    (2, 'Identidade visual Clínica Sorriso', 'Clínica Sorriso',
        'Logótipo, cores, papelaria e manual de normas gráficas.',
        'ativo', CURRENT_DATE + 9, '#3b5a7a'),
    (3, 'Loja online Casa Verde', 'Casa Verde, Lda.',
        'Loja de plantas e vasos com pagamentos online.',
        'ativo', CURRENT_DATE + 35, '#24493c'),
    (4, 'Campanha de Natal Ótica Lince', 'Ótica Lince',
        'Anúncios, montra e calendário de publicações para a época natalícia.',
        'ativo', CURRENT_DATE + 40, '#a63a2b'),
    (5, 'Menu digital Restaurante Maré', 'Restaurante Maré',
        'Menu em página web com código QR nas mesas.',
        'concluido', CURRENT_DATE - 5, '#6b4f7a');
  PERFORM setval('projetos_id_seq', 5);

  FOR r IN
    SELECT * FROM (VALUES
      (1,  1, 'Definir estrutura de páginas',           'feito',      'media',   3, -20,  3, 'Mapa do site: início, produtos, sobre nós, encomendas e contactos.'),
      (2,  1, 'Wireframes da página inicial',           'feito',      'alta',    1, -14,  6, NULL),
      (3,  1, 'Design da página inicial',               'feito',      'alta',    1,  -7, 10, NULL),
      (4,  1, 'Design da página de produtos',           'em_revisao', 'media',   1,   1,  8, 'Grelha de produtos com filtros por categoria.'),
      (5,  1, 'Desenvolver página inicial',             'em_curso',   'alta',    2,   4, 12, NULL),
      (6,  1, 'Textos das páginas',                     'em_curso',   'media',   4,  -2,  6, 'Falta receber o texto da página Sobre nós.'),
      (7,  1, 'Formulário de encomendas',               'por_fazer',  'media',   2,  10,  5, 'Envia email à padaria e guarda o pedido.'),
      (8,  1, 'Fotografias dos produtos',               'por_fazer',  'baixa', NULL,  12, NULL, 'A combinar com o cliente: sessão de fotos na padaria.'),
      (9,  1, 'Configurar domínio e alojamento',        'por_fazer',  'urgente', 2,   2,  2, NULL),
      (10, 1, 'Testes em telemóvel',                    'por_fazer',  'media',   3,  16,  4, NULL),

      (11, 2, 'Briefing com a clínica',                 'feito',      'media',   3, -18,  2, NULL),
      (12, 2, 'Pesquisa de concorrência',               'feito',      'baixa',   4, -15,  3, NULL),
      (13, 2, 'Três propostas de logótipo',             'feito',      'alta',    1,  -8, 12, NULL),
      (14, 2, 'Ajustes ao logótipo escolhido',          'em_curso',   'alta',    1,   1,  5, 'A clínica escolheu a proposta 2.'),
      (15, 2, 'Paleta de cores e tipografia',           'em_curso',   'media',   1,   3,  4, NULL),
      (16, 2, 'Cartões de visita',                      'por_fazer',  'baixa',   1,   6,  3, NULL),
      (17, 2, 'Papel timbrado e assinatura de email',   'por_fazer',  'baixa',   1,   8,  3, NULL),
      (18, 2, 'Manual de normas gráficas',              'por_fazer',  'media',   3,   9,  8, NULL),

      (19, 3, 'Levantamento de requisitos',             'feito',      'alta',    3, -12,  4, NULL),
      (20, 3, 'Escolher plataforma de pagamentos',      'feito',      'media',   2,  -6,  2, NULL),
      (21, 3, 'Modelo de dados dos produtos',           'em_revisao', 'alta',    2,  -1,  6, 'Variantes de tamanho e cor.'),
      (22, 3, 'Layout do catálogo',                     'em_curso',   'alta',    1,   5, 10, NULL),
      (23, 3, 'Carrinho e checkout',                    'por_fazer',  'urgente', 2,  14, 20, NULL),
      (24, 3, 'Importar 120 produtos',                  'por_fazer',  'media',   4,  18,  8, NULL),
      (25, 3, 'Emails automáticos de encomenda',        'por_fazer',  'baixa',   2,  24,  5, NULL),
      (26, 3, 'Política de devoluções e termos',        'por_fazer',  'media',   4,  20,  3, NULL),

      (27, 4, 'Conceito criativo',                      'em_curso',   'alta',    4,   2,  6, NULL),
      (28, 4, 'Anúncios para redes sociais',            'por_fazer',  'media',   1,  12, 10, NULL),
      (29, 4, 'Calendário de publicações',              'por_fazer',  'media',   3,   8,  3, NULL),
      (30, 4, 'Montra da loja (layout)',                'por_fazer',  'baixa',   1,  25,  6, NULL),
      (31, 4, 'Orçamento de impressão',                 'por_fazer',  'media', NULL,  15, NULL, 'Pedir três orçamentos a gráficas.'),

      (32, 5, 'Recolher pratos e preços',               'feito',      'media',   3, -30,  3, NULL),
      (33, 5, 'Design do menu',                         'feito',      'alta',    1, -24,  8, NULL),
      (34, 5, 'Página do menu com código QR',           'feito',      'alta',    2, -17,  9, NULL),
      (35, 5, 'Entrega e formação ao cliente',          'feito',      'media',   3,  -6,  2, NULL)
    ) AS t(id, projeto, titulo, estado, prio, resp, off, est, descr)
  LOOP
    INSERT INTO tarefas (id, projeto_id, titulo, descricao, estado, prioridade, responsavel_id, prazo,
                         estimativa, posicao, criado_em, concluida_em)
    VALUES (
      r.id, r.projeto, r.titulo, r.descr, r.estado, r.prio, r.resp, CURRENT_DATE + r.off, r.est,
      (SELECT COALESCE(MAX(posicao) + 1, 0) FROM tarefas WHERE projeto_id = r.projeto AND estado = r.estado),
      NOW() - INTERVAL '35 days' + (r.id || ' hours')::INTERVAL,
      CASE WHEN r.estado = 'feito'
           THEN (CURRENT_DATE + LEAST(r.off - 1, -1))::timestamp + INTERVAL '17 hours' END
    );

    -- Horas registadas: tarefas feitas e em curso têm tempo gasto perto da estimativa.
    IF r.resp IS NOT NULL AND r.est IS NOT NULL AND r.estado <> 'por_fazer' THEN
      n := 2 + r.id % 2;
      total := r.est * CASE r.estado WHEN 'feito' THEN 0.9 + (r.id % 4) / 10.0
                                     WHEN 'em_revisao' THEN 0.85
                                     ELSE 0.4 END;
      FOR k IN 1..n LOOP
        IF r.estado = 'feito' THEN
          dia := CURRENT_DATE + LEAST(r.off - 1, -1) - (k - 1) * 2;
        ELSE
          dia := CURRENT_DATE - ((k - 1) * 2 + r.id % 3);
        END IF;
        INSERT INTO tempo (tarefa_id, membro_id, data, horas)
        VALUES (r.id, r.resp, dia, GREATEST(0.5, ROUND(total / n * 2) / 2));
      END LOOP;
    END IF;
  END LOOP;
  PERFORM setval('tarefas_id_seq', 35);

  INSERT INTO subtarefas (tarefa_id, titulo, feita) VALUES
    (5, 'Cabeçalho e navegação', TRUE),
    (5, 'Secção de destaques', TRUE),
    (5, 'Galeria de produtos', FALSE),
    (5, 'Rodapé e contactos', FALSE),
    (4, 'Grelha de produtos', TRUE),
    (4, 'Ficha de produto', TRUE),
    (4, 'Versão para telemóvel', FALSE),
    (9, 'Registar o domínio', FALSE),
    (9, 'Configurar o DNS', FALSE),
    (9, 'Instalar certificado SSL', FALSE),
    (14, 'Versão a preto e branco', TRUE),
    (14, 'Versão horizontal', FALSE),
    (14, 'Margens de segurança', FALSE),
    (22, 'Filtros por categoria', TRUE),
    (22, 'Cartão de produto', FALSE),
    (22, 'Paginação', FALSE);

  INSERT INTO comentarios (tarefa_id, autor_id, texto, criado_em) VALUES
    (6,  4, 'Falta o texto da página Sobre nós. O cliente ainda não enviou a história da padaria.', NOW() - INTERVAL '3 days'),
    (6,  3, 'Já pedi ao cliente, deve chegar até quinta.', NOW() - INTERVAL '2 days 4 hours'),
    (4,  3, 'O cliente gostou da grelha e pediu só fotografias maiores.', NOW() - INTERVAL '1 day 2 hours'),
    (21, 2, 'As variantes de tamanho e cor ficam numa tabela própria. Peço revisão antes de avançar.', NOW() - INTERVAL '2 days'),
    (21, 3, 'Revisto. Só falta confirmar se os preços levam IVA.', NOW() - INTERVAL '1 day'),
    (14, 1, 'A clínica prefere o azul mais escuro. Já atualizei.', NOW() - INTERVAL '5 hours'),
    (27, 4, 'Duas ideias: "Veja o Natal" e "Presentes à vista". A escolher até sexta.', NOW() - INTERVAL '1 day 6 hours');
END $$;
