# Ranking BR — v0.2.9

Versão funcional da plataforma de ranking das cooperativas BR, construída com Next.js, Vercel e Firebase.

## O que funciona nesta versão

- login real com Firebase Authentication;
- perfis `DEV` e `ADMIN`;
- leitura de dois relatórios **Gestão Adesão** no formato `.xls`, um do SGA Leves e outro do SGA Truck;
- consolidação dos dois sistemas em um único ranking, somando placas e previsão por executivo e cooperativa;
- reconhecimento automático de executivos pelo campo `Voluntário`;
- contagem de toda placa produzida no período, independentemente da situação atual;
- 1 ponto por veículo e desempate pela maior previsão financeira;
- identificação de duplicidades pelo chassi;
- prévia antes de gravar qualquer dado;
- cadastro e composição de equipes;
- cadastro de executivos, nome curto para arte, foto e ajuste de enquadramento;
- histórico de fechamentos com a equipe preservada no momento da confirmação;
- ranking de executivos e de equipes;
- comparação de posição com o fechamento anterior;
- movimentação de posição para executivos e equipes;
- previsão de faturamento e ticket médio individual e por equipe;
- vínculo automático da equipe pelo código da cooperativa no relatório;
- inclusão de todas as cooperativas BR, inclusive as ainda sem nome de equipe configurado;
- dashboard com dados reais;
- geração da arte Top 3 em Feed 4:5 ou Story 9:16, com previsão de faturamento e ticket médio;
- geração de arte separada para o Top 3 de executivos ou de equipes;
- aviso quando alguém do Top 3 ainda está sem foto;
- exclusão confirmada de rankings incorretos por Administrador ou Desenvolvedor, liberando uma nova importação;
- tema claro ou escuro com a preferência mantida no navegador;
- histórico individual de executivos e equipes com comparação de posição, placas, previsão e ticket médio;
- gráfico de evolução de posição entre os fechamentos;
- comparação personalizada entre quaisquer dois fechamentos;
- destaques automáticos de maior subida, queda e crescimento em placas ou faturamento;
- busca de executivos, equipes e cooperativas, com filtro por equipe;
- auditoria do fechamento com arquivos Leves e Truck, responsável, data e validações;
- exportação do ranking completo em Excel e PDF;
- valores monetários exportados ao Excel como números editáveis no padrão brasileiro;
- linhas alternadas nas tabelas para facilitar a leitura horizontal;
- download da arte em PNG.

## Privacidade e armazenamento

O relatório é processado localmente no navegador. Nomes de associados, placas e chassis não são enviados ao Firebase. O banco recebe somente dados consolidados do fechamento, como executivo, equipe, quantidade e previsão.

O Firebase Storage não precisa ser ativado. As fotos dos executivos são reduzidas para até 720 pixels, preservando a proporção, e guardadas no próprio cadastro do Firestore. Isso permite ajustar posição e zoom na arte e mantém o projeto compatível com o plano Spark sem faturamento.

## Atualizar o GitHub

Envie todo o conteúdo desta pasta para a raiz do mesmo repositório usado pela Vercel. O `package.json` precisa permanecer na raiz.

Depois do envio, a Vercel iniciará um novo deploy automaticamente. As variáveis de ambiente já cadastradas continuam salvas e não precisam ser digitadas novamente.

## Publicar as regras do Firestore

No Firebase Console:

1. abra **Firestore Database**;
2. entre na aba **Regras**;
3. substitua o conteúdo pelo arquivo `firestore.rules` desta versão;
4. clique em **Publicar**.

As coleções utilizadas são:

- `usuarios`;
- `equipes`;
- `executivos`;
- `imports`;
- `rankings`;
- `configuracoes`.

## Atualizar o Apps Script mantendo a mesma URL

1. substitua o conteúdo atual pelo arquivo `apps-script/Code.gs`;
2. clique em **Implantar → Gerenciar implantações**;
3. abra a implantação atual pelo ícone de lápis;
4. em **Versão**, escolha **Nova versão**;
5. clique em **Implantar**.

A URL terminada em `/exec` permanece a mesma.

## Variáveis da Vercel

Esta versão utiliza as mesmas variáveis já cadastradas:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APPS_SCRIPT_URL=
```

As variáveis `NEXT_PUBLIC_` da configuração Web do Firebase podem permanecer como **Config** na Vercel.

## Primeiro uso recomendado

1. abra **Equipes** e confira os códigos BR e os nomes das equipes;
2. abra **Importar relatório** e selecione o Gestão Adesão `.xls` do SGA Leves e o do SGA Truck;
3. confira os  participantes identificados;
4. confira a equipe identificada automaticamente pela cooperativa;
5. confirme o fechamento;
6. abra **Executivos** para definir o nome curto, cadastrar e enquadrar as fotos;
7. consulte **Rankings**, compare dois fechamentos e confira a auditoria dos arquivos;
8. exporte o resultado completo em Excel ou PDF quando necessário;
9. abra **Gerar arte**, escolha executivos ou equipes e baixe o Top 3.

Os participantes ainda não cadastrados são criados automaticamente na confirmação. Nos próximos relatórios, o sistema os reconhecerá pelo nome normalizado, ignorando diferenças de letras maiúsculas e acentos.

## Teste local

```bash
npm install
npm run dev
```

Depois acesse `http://localhost:3000`.

## Regras fixadas para a v0.2.9

- toda linha produzida no período entra no ranking, independentemente da situação atual do veículo;
- situações como `ATIVO`, `C.A.T. - EVENTO COLISÃO`, pendências e demais estados informados pelo SGA são consideradas;
- cada chassi único vale 1 ponto, mesmo se aparecer nos dois sistemas;
- o primeiro desempate é a maior soma da previsão financeira;
- o ticket médio é calculado por `previsão de faturamento ÷ quantidade de placas`;
- a movimentação compara cada posição com o fechamento imediatamente anterior;
- a cooperativa do relatório define a equipe do executivo e o agrupamento coletivo;
- todas as cooperativas participam; códigos ainda não configurados ficam sinalizados até receberem um nome de equipe;
- a equipe fica registrada como estava na data do fechamento;
- o mesmo par de relatórios não pode ser confirmado duas vezes.
