# Automatizador HackerWars

> **Diferentemente do HExbot, que extraía e coletava seus dados, esta extensão não usa sockets. Ela nem contém endereços IP ou contas codificados.**
>
> Os únicos dados codificados são os nomes/tamanhos predefinidos dos botões de infecção Spam, Warez e Miner:
>
> - **Spam**: `Super Spam.vspam` 1 GB, `Advanced Spam.vspam` 236 MB, `Decent Spam.vspam` 36 MB
> - **Warez**: `Super Warez.vwarez` 1 GB, `Advanced Warez.vwarez` 236 MB, `Decent Warez.vwarez` 36 MB
> - **Miner**: `Super Miner.vminer` 1,7 GB, `Advanced Miner.vminer` 413 MB, `Decent Miner.vminer` 63 MB

Uma extensão de navegador de acionamento manual (Manifest V3) que automatiza tarefas repetitivas em [hackerwars.io](https://hackerwars.io), um jogo de navegador com tema de hacking. Ela adiciona um painel flutuante à página com controles de iniciar/parar para cada automação; nada é executado até você acionar.

Todo o código-fonte está comentado e nomeado em português brasileiro. Os nomes próprios do jogo (nomes de bancos, vírus/arquivos) e qualquer texto que precise corresponder literalmente ao site do jogo, que é em inglês, permanecem em inglês; todo o restante — identificadores, comentários, rótulos e mensagens exibidas — está em português brasileiro.

## Recursos

| Módulo | O que faz |
| --- | --- |
| `missions.js` | Aceita e conclui automaticamente missões (excluir/roubar software, consultas bancárias e transferências) por prioridade. |
| `infection2.js` | Compra/instala vírus (e um segundo arquivo opcional instalado após o principal) nos IPs-alvo, lidando com espaço em disco, RAM e erros de instalação duplicada. |
| `research.js` | Alterna entre páginas/processos de pesquisa com atrasos aleatórios para parecer orgânico; aceita vários ciclos por execução. |
| `puzzle.js` | Responde às charadas/quebra-cabeças do jogo usando uma tabela de respostas conhecida. |
| `masshack.js` | Percorre uma fila de IPs-alvo e invade cada um sequencialmente. |
| `repkill.js` | Localiza e executa missões de "destroy server" / "delete software" / "steal software" / "transfer money" / "check bank status" para reputação. |
| `collect.js` | Coleta o dinheiro acumulado no jogo em um intervalo e limpa o log depois. |
| `softwareGather.js` | Examina o servidor conectado no momento em busca de software baixável e o registra. |
| `logs.js` | Extrai endereços IP do visualizador de logs do jogo para uso posterior (por exemplo, pelo masshack) e pode observar/monitorar um log em um ciclo rápido de recarga. |
| `overlay.js` / `content.js` | Injeta e conecta o painel flutuante exibido na página do jogo. |
| `popup.html` / `popup.js` | Interface do pop-up da extensão para configurar e alternar automações. |
| `background.js` | Service worker responsável pelo agendamento (`alarms`), um monitor de invasões no próprio log em segundo plano e estado entre abas. |
| `shared.js` | Auxiliares comuns (localizadores de elementos, mecanismo de execução de etapas etc.) usados pelos módulos. |

## Instalação

1. Clone ou baixe este repositório.
2. Abra `chrome://extensions` (ou o equivalente no seu navegador baseado em Chromium).
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione esta pasta.
5. Acesse [hackerwars.io](https://hackerwars.io) e use o painel flutuante ou o pop-up da extensão para iniciar/parar automações individuais.

## Permissões

Declaradas em [manifest.json](manifest.json): `activeTab`, `scripting`, `storage`, `downloads`, `alarms` e acesso de host limitado a `https://hackerwars.io/*`.

## Histórico de alterações

### Não lançado

**Adicionado**

- `missions.js`: durante missões "steal software", após baixar o arquivo da missão, também baixa qualquer outro software disponível no alvo antes de sair.

**Corrigido**

- `missions.js` / `puzzle.js`: o próprio login agora é apagado do log do alvo antes de sair (`logout`), em vez de deixar o rastro de invasão lá — mesmo tratamento que `infection2.js` e `research.js` já davam ao próprio log.

### 2.2.0

**Adicionado**

- Novo módulo `infection2.js` (substitui `ddos.js`): resolve uma vez os links de envio por meio de um Download Center configurado e os mantém em cache; aceita um segundo arquivo único opcional instalado *depois* do vírus principal em cada alvo (acompanhado separadamente, para que o alvo ainda conte como infectado caso apenas essa segunda instalação falhe) e uma pasta opcional do Download Center como segunda fonte de links. Quando toda a lista de alvos termina, o próprio `/log` é totalmente limpo (`ddos.js` apenas parava).
- `research.js`: o alvo de pesquisa agora é escolhido ao vivo na própria lista da página da universidade pelo nome, em vez de apenas retomar uma URL armazenada. Vários ciclos de pesquisa podem ser executados com um único início. Uma coleta opcional de renda ociosa pode ocorrer antes de limpar o log em cada ciclo. O `/log` da própria conta agora é limpo em todo ciclo.
- `repkill.js`: agora também obtém missões "Transfer Money" / "Check Bank Status", além de Destroy Server / Delete Software / Steal Software.
- `masshack.js`: a página 404 de um IP-alvo obsoleto/alterado agora é detectada e ignorada imediatamente, em vez de aguardar todo o tempo limite.
- `background.js`: monitor de invasões do próprio log em segundo plano que consulta `/log` diretamente pelo service worker (nenhuma aba precisa permanecer na página) e sinaliza a barra de ferramentas ao detectar uma linha de invasão legítima.

**Alterado**

- `missions.js` / `puzzle.js` / `masshack.js`: a sequência de invasão agora navega diretamente para a URL do método de bruteforce, em vez de primeiro clicar no menu de hack.
- Todos os módulos agora navegam diretamente para `internet?view=logout` para sair, em vez de localizar e clicar em um elemento de logout.
- Interface do pop-up: menu reorganizado em submenus; o botão de pânico "Parar tudo" agora mostra uma lista ao vivo do que está realmente em execução; as notas explicativas de vários painéis foram reduzidas a uma frase curta cada.

**Corrigido**

- `research.js`: a etapa "localizar o link Complete em /processes" agora se limita à entrada cuja descrição menciona "research" — a versão anterior podia clicar em um processo já concluído não relacionado e marcar a pesquisa como feita enquanto ela ainda estava em contagem regressiva.
- `research.js`: agora é tratada uma submissão concluída sem contagem regressiva, em vez de consultar para sempre uma contagem que nunca existiu.
- `research.js`: o longo ciclo de navegação e espera entre páginas de pesquisa não usa mais um temporizador na página que poderia travar durante a noite em uma aba em segundo plano — ele passa por `chrome.alarms`.
- `overlay.js`: `popup.html` agora é buscado com `cache: "no-store"` — uma cópia antiga em cache após recarregar a extensão não quebra mais o painel injetado.
- `background.js`: a verificação de invasão no próprio log agora corresponde especificamente a uma linha de login root, em vez de "qualquer coisa sem o prefixo localhost", que poderia marcar por engano linhas rotineiras de relatório de renda como invasões.
- `infection2.js`: os envios de limpeza de log (por alvo e a limpeza final do próprio log) agora aguardam o salvamento terminar antes de sair — antes, o executor podia navegar para outra página no meio do salvamento.

### 2.1.0 e anteriores

Lançamento base. O histórico anterior à versão 2.1.0 não foi registrado neste documento. Neste ponto, a funcionalidade abrangia os módulos listados em Recursos: missões, DDoS, pesquisa, resolução de quebra-cabeças, invasão em massa, coleta, Rep Kill, coleta de software, extração de logs e a interface de pop-up/painel.

## Aviso

Esta ferramenta interage com um jogo de terceiros. Use por sua conta e risco, respeitando os termos de serviço do jogo.

## Créditos

Tradução para português brasileiro e manutenção: [SpywareDoctor/HWAutomation](https://github.com/SpywareDoctor/HWAutomation).
