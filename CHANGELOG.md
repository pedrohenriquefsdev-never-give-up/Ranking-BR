# Histórico de versões

## v0.2.12 — Leitura robusta dos relatórios reais Leves + Truck

- aceita o relatório Truck vazio exatamente como exportado pelo SGA, mesmo sem cabeçalho de produção;
- reconhece estruturalmente o resumo de zero veículos, sem depender de uma frase única;
- trata relatórios HTML `.xls` em UTF-8 e Windows-1252;
- tolera caracteres de acentuação corrompidos nos nomes das colunas;
- informa no erro se o problema veio do arquivo de Leves ou do arquivo de Truck;
- validação preparada com o par real `Leves out.xls` + `Truck Out(1).xls` de 06/10/2026.

## v0.2.11 — Correção do formato vazio real do SGA Truck

- reconhecimento do arquivo vazio real exportado pelo SGA Truck;
- leitura do resumo `Total de veículos encontrados: 0` mesmo quando o sistema não gera o cabeçalho das colunas;
- preservação da data, horário e usuário informados no relatório vazio para auditoria;
- arquivos HTML sem o cabeçalho e sem a confirmação explícita de total zero continuam bloqueados;
- validação realizada com o arquivo real `Truck Out.xls` de 06/10/2026.

## v0.2.10 — Hotfix para relatório Truck sem produção

- processamento liberado com apenas um relatório, Leves ou Truck;
- relatório Truck passa a ser opcional quando não houver produção no período;
- arquivo válido contendo somente o cabeçalho é aceito como fonte sem registros;
- arquivo selecionado com zero bytes é ignorado quando o outro relatório possui produção;
- auditoria registra somente as fontes efetivamente processadas e identifica arquivos sem produção;
- bloqueio mantido quando nenhum dos relatórios possui registros válidos para o ranking.

## v0.2.9 — Hotfix visual e exportação numérica

- alternância entre linhas claras e levemente acinzentadas nas tabelas;
- adaptação da alternância de linhas aos temas claro e escuro;
- previsão de faturamento e ticket médio exibidos com vírgula decimal no arquivo Excel;
- valores monetários exportados como células numéricas, permitindo formatação, soma, filtros e fórmulas;
- alinhamento numérico à direita e linhas alternadas também no arquivo exportado.

## v0.2.8 — Produção do período em todas as situações

- inclusão de toda placa produzida no período, independentemente da situação atual no SGA;
- situações como ATIVO e C.A.T. - EVENTO COLISÃO passam a participar igualmente do ranking;
- remoção da preferência por registros ATIVO na deduplicação entre Leves e Truck;
- escolha do registro duplicado pela data de contrato mais recente;
- auditoria passa a separar veículos ativos de registros efetivamente considerados;
- atualização dos textos do painel, ranking, comparações, arte e exportações para placas produzidas;
- validação com os relatórios reais de 25/09/2026, contabilizando as 9 placas do Thiago.

## v0.2.7 — Hotfix de compatibilidade após exclusão

- correção da exceção que podia derrubar a tela ao excluir o ranking mais recente;
- compatibilidade automática com fechamentos criados em versões anteriores;
- preenchimento seguro de cooperativas, equipes, ticket médio e movimentação ausentes;
- normalização dos rankings antigos antes da exibição e do recálculo do histórico;
- proteção adicional das exportações Excel para registros legados.

## v0.2.6 — Comparação, auditoria e exportações

- seleção livre de dois fechamentos para comparação;
- resumo das diferenças de veículos, faturamento e participantes;
- destaques automáticos de maior subida, maior queda, crescimento em placas e crescimento financeiro;
- alternância dos destaques entre executivos e equipes;
- busca por executivo, equipe ou cooperativa e filtro por equipe;
- auditoria detalhada dos arquivos SGA Leves e SGA Truck usados no fechamento;
- identificação do responsável, data da importação, período e regra aplicada;
- exibição de linhas analisadas, ativos, duplicidades internas e entre sistemas e placas ausentes;
- exportação completa do ranking em Excel compatível e PDF;
- exportações geradas no navegador, sem serviço externo ou custo adicional.

## v0.2.5 — Tema escuro, evolução e arte de equipes

- switch de tema claro/escuro disponível no cabeçalho;
- preferência visual salva no navegador para os próximos acessos;
- adaptação de painéis, tabelas, formulários, modais e importação ao modo escuro;
- gerador de arte com seleção entre Top 3 de executivos e Top 3 de equipes;
- arte de equipes com posição, participantes, placas, previsão de faturamento e ticket médio;
- histórico de evolução selecionável por executivo ou equipe;
- comparação com o fechamento anterior para posição, placas, previsão e ticket médio;
- gráfico da trajetória de posição e tabela completa por fechamento.

## v0.2.4 — Arte aprimorada e correção de fechamentos

- nome curto opcional para uso exclusivo na arte, mantendo o nome completo do relatório para identificação;
- redução automática do nome e proteção contra sobreposição no Top 3;
- previsão de faturamento e ticket médio incluídos na arte de Feed e Story;
- ajuste horizontal, vertical e de zoom das fotos dos participantes;
- aviso com atalho de cadastro quando alguém do Top 3 estiver sem foto;
- exclusão de ranking com confirmação para Administrador e Desenvolvedor;
- remoção conjunta do registro de importação, permitindo corrigir e reenviar o mesmo par de relatórios;
- preservação dos cadastros de executivos, fotos e equipes após excluir um fechamento;
- recálculo das movimentações dos fechamentos restantes.

## v0.2.3 — Consolidação SGA Leves + SGA Truck

- duas áreas obrigatórias de importação, uma para cada SGA;
- leitura paralela dos relatórios Gestão Adesão de Leves e Truck;
- união automática de executivos e cooperativas em um único fechamento;
- soma de placas e previsão de faturamento nos dois sistemas;
- ticket médio calculado sobre o total consolidado;
- remoção e sinalização de chassis repetidos entre os sistemas;
- auditoria separada de cada arquivo e do resultado consolidado;
- histórico salva a identificação dos dois relatórios usados.

## v0.2.2 — Equipes por cooperativa

- leitura automática do código `BR.xx` na coluna Cooperativa;
- mapeamento padrão das 11 equipes informadas;
- inclusão de todas as demais cooperativas no ranking;
- sinalização de códigos ainda sem nome de equipe configurado;
- vínculo automático dos executivos, sem seleção manual repetitiva;
- ranking coletivo calculado diretamente pelos veículos ativos de cada cooperativa.

## v0.2.1 — Evolução e indicadores financeiros

- coluna `Prev. Fat.` nos rankings de executivos e equipes;
- coluna `T. Médio`, calculada pela previsão de faturamento dividida pela quantidade de placas;
- movimentação de equipes em relação ao fechamento anterior;
- sinalização de quem subiu, desceu ou manteve a posição;
- prévia de importação com placas, previsão de faturamento e ticket médio.

## v0.2.0 — Ranking funcional

- importação real do relatório Gestão Adesão `.xls`;
- leitura correta do HTML em codificação Windows-1252;
- validação do layout e deduplicação por chassi;
- regra de contagem somente para veículos ativos;
- desempate por previsão financeira;
- prévia completa antes da confirmação;
- criação automática de novos executivos;
- CRUD de equipes e executivos;
- vínculo de participantes às equipes;
- fotos comprimidas no Firestore, sem Firebase Storage;
- histórico com composição da equipe preservada por fechamento;
- ranking de executivos e equipes;
- evolução de posição entre fechamentos;
- dashboard conectado aos dados reais;
- arte Top 3 para Feed e Story com download em PNG;
- relatório original e dados individuais de associados não são armazenados.

## v0.1.0 — Base visual e autenticação

- identidade visual inicial do Ranking BR;
- login integrado ao Firebase Authentication;
- perfis `DEV` e `ADMIN`;
- proteção das páginas internas;
- dashboard e navegação responsivos;
- regras iniciais do Firestore;
- endpoint de teste para o Google Apps Script;
- estrutura pronta para Vercel.
