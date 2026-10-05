import type { PageGuideContent } from "@/features/help/types";

export const cashFlowGuide: PageGuideContent = {
  id: "cash-flow",
  title: "Como usar o fluxo de caixa",
  intro:
    "Livro-caixa do grupo: entradas e saídas do período, com status de pagamento, conciliação, rateio e notas. O Pix do Sicredi chega pela tela Integrações (sincronização automática em segundo plano quando a conta está ligada).",
  steps: [
    {
      id: "period-and-stats",
      title: "Período e saldos",
      body: (
        <>
          <p>
            O controle de período (mês/ano no topo) define o recorte. Os cards mostram saldo inicial, entradas, saídas e
            saldo atual desse intervalo — não o extrato bancário inteiro.
          </p>
          <p className="muted">
            Cores: pago em verde, pendente em amarelo, vencido em vermelho. Tag azul = ainda sem conciliar.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-saldo.png",
        alt: "Cartões de saldo no topo da tela de caixa",
        caption: "Os cards respondem ao mês/ano selecionados.",
      },
    },
    {
      id: "next-steps",
      title: "Próximos passos",
      body: (
        <>
          <p>
            No topo do caixa ficam os cartões de <strong>Próximos passos</strong>: mensalidades vencidas, Pix com
            mensalidade sugerida, possíveis duplicados, mês anterior ainda aberto e dias sem sincronizar o extrato.
          </p>
          <p className="muted">
            Cada cartão leva direto à ação: <em>Revisar sugestões</em> abre a conciliação, <em>Revisar</em> abre os
            duplicados e <em>Ir para o mês</em> seleciona o mês a fechar. Quando está tudo em dia, aparece um cartão
            verde.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-proximos-passos.png",
        alt: "Cartões de próximos passos: vencidas, conciliar, duplicados, fechamento e extrato",
        caption: "Da mais urgente para a menos; cada cartão abre a ação certa.",
      },
    },
    {
      id: "manual",
      title: "Lançamento manual: comece pelo tipo",
      body: (
        <>
          <p>
            Use <strong>Lançamento manual</strong> para saídas, acordos, cantina e qualquer movimento que não veio do
            extrato. O primeiro campo é <strong>O que é este lançamento?</strong>: o tipo escolhido define os campos que
            aparecem abaixo.
          </p>
          <ul>
            <li>
              Quando o tipo só tem uma direção (Mensalidade, Registro, Acordo), o sistema já sabe se é entrada ou saída
              e se a conta é fixa ou variável.
            </li>
            <li>
              Tipos de evento (Noite do Hamburguer, Feira Medieval…) aceitam os dois: aparece{" "}
              <strong>Entrada (recebemos)</strong> ou <strong>Saída (pagamos)</strong>.
            </li>
            <li>
              <strong>Já foi pago?</strong> Sim pede <em>Quando foi pago?</em>; Não pede <em>Quando vence?</em>.
            </li>
          </ul>
          <p className="muted">
            Créditos do banco entram pela Integração (Sicredi ou importação). Nesta tela o foco é classificar, editar e
            conciliar.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-lancamento-tipo.png",
        alt: "Formulário de lançamento manual vazio, com o campo O que é este lançamento? no topo",
        caption: "O tipo vem primeiro e decide o resto do formulário.",
      },
    },
    {
      id: "manual-check",
      title: "Confira antes de salvar",
      body: (
        <>
          <p>
            No fim do formulário, <strong>Confira antes de salvar</strong> mostra o lançamento numa frase: valor, o que
            é, associado e data. Leia antes de clicar em Lançar: mês ou associado errados aparecem aqui.
          </p>
          <ul>
            <li>
              <strong>Mensalidade</strong> pede o associado e o <strong>mês que a mensalidade quita</strong>. É esse mês
              que fica pago na grade, mesmo que o Pix seja de outro mês. Abaixo do valor aparecem a tabela do associado
              e a <strong>categoria da composição</strong> (ex.: <em>Demais ramos · não sócio</em>,{" "}
              <em>Pioneiro · sócio Lindóia</em>, <em>Irmãos / filho de chefe</em>) com o período que vale naquele mês.
              Passe o mouse na etiqueta para ver a divisão: grupo, caixinha, lanche, clube e diluição.
            </li>
            <li>
              <strong>Avisos em amarelo</strong> (valor fora da tabela, mensalidade do mesmo mês já existente, pagamento
              no futuro) não impedem salvar, mas pedem que você marque <em>Conferi os avisos</em>.
            </li>
            <li>
              <strong>Erros em vermelho</strong> (sem tipo, sem valor, mensalidade sem associado) impedem salvar até
              serem corrigidos.
            </li>
          </ul>
          <p className="muted">
            Se já existe a mensalidade pendente do mês, prefira <em>Marcar como pago</em> nela em vez de lançar outra:
            assim não fica duplicada.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-lancamento-mensalidade.png",
        alt: "Mensalidade de maio com valor fora da tabela e aviso de mensalidade já existente",
        caption: "Os avisos explicam o que conferir; o Lançar só libera depois de Conferi.",
      },
    },
    {
      id: "manual-details",
      title: "Saídas e Mais detalhes",
      body: (
        <>
          <p>
            Em uma <strong>saída</strong>, o campo de comprovante ou nota aparece logo no formulário. Anexe a foto ou o
            PDF para a conciliação.
          </p>
          <p>
            <strong>Mais detalhes</strong> fica recolhido e já vem preenchido: ramo (do tipo ou do associado), meio
            (Pix), vencimento igual à data de pagamento, previsão de gastos e conta fixa/variável. Abra só quando
            precisar mudar algo; o resumo ao lado do título mostra o que está valendo.
          </p>
          <p className="muted">
            Em mensalidade, a descrição é gerada pelo mês e associado (ex.: “Mensalidade Maio 2026 — Nome”). Você pode
            editá-la em Mais detalhes.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-lancamento-saida.png",
        alt: "Saída de evento com comprovante e a seção Mais detalhes aberta",
        caption: "Detalhes recolhidos e já preenchidos; abra só para mudar.",
      },
    },
    {
      id: "identify",
      title: "Identificar linhas sem tipo",
      body: (
        <>
          <p>
            PIX e importações do extrato chegam em geral <strong>já pagos</strong> e às vezes sem rubrica. O banner
            lista o que falta. Em <strong>Identificar agora</strong> você percorre a fila no mesmo formulário do
            lançamento manual: escolha o tipo, confira o associado e o resumo, e salve para ir ao próximo.
          </p>
          <p className="muted">
            Não use “Marcar como pago” nessas linhas: elas já estão pagas. A baixa da mensalidade na grade depende de
            classificar o crédito (veja o passo seguinte).
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-banner.png",
        alt: "Banner de lançamentos sem tipo definido",
        caption: "Quanto mais cedo identificar, mais confiável o saldo.",
      },
    },
    {
      id: "reconciliation",
      title: "Conciliação assistida",
      body: (
        <>
          <p>
            Para cada Pix ainda sem tipo, o sistema procura quem pagou (CPF, chave Pix, nome do responsável ou do
            associado) e uma mensalidade em aberto com o mesmo valor da tabela. Em <strong>Revisar sugestões</strong>{" "}
            aparece “Parece: Mensalidade de setembro de …” e o motivo.
          </p>
          <ul>
            <li>
              <strong>Confirmar</strong> transforma o crédito na mensalidade daquele mês e dá baixa na grade; a cobrança
              pendente sai.
            </li>
            <li>
              <strong>Não é isso</strong> recusa a sugestão, que não volta a aparecer.
            </li>
            <li>Sem sugestão, o crédito segue para Identificar.</li>
          </ul>
        </>
      ),
      media: {
        src: "/help/cash-flow-conciliacao.png",
        alt: "Conciliação assistida com duas sugestões e um crédito sem sugestão",
        caption: "Confira o motivo antes de confirmar.",
      },
    },
    {
      id: "bank-to-mensalidade",
      title: "Extrato pago → baixar mensalidade",
      body: (
        <>
          <p>
            Quando o crédito do banco já entrou <strong>pago</strong> e você precisa amarrar à mensalidade (e
            variações):
          </p>
          <ul>
            <li>
              <strong>Um mês</strong> — Identificar/Alterar: tipo <strong>Mensalidade</strong>, associado e o{" "}
              <strong>mês que a mensalidade quita</strong>; deixe <em>Já foi pago?</em> em Sim com a data do extrato. Se
              o resumo avisar que já existe a mensalidade pendente do mês, exclua só a pendente.
            </li>
            <li>
              <strong>Adiantamento ou vários meses atrasados</strong> — use o botão{" "}
              <strong>Baixar mensalidades deste Pix</strong> (ícone de calendário) na linha do crédito. Escolha o
              associado, <strong>Pontual</strong> ou <strong>Com atraso</strong> e marque os meses (2 ou mais) que o PIX
              cobre. Cada parte vai para a competência do mês marcado, independente da data do PIX, que fica só como
              data de pagamento. A soma precisa ser igual ao PIX; as pendências desses meses são substituídas
              automaticamente.
            </li>
            <li>
              <strong>Mensalidade + parcela de dívida embutida</strong> — o valor esperado na grade já inclui a parcela.
              Classifique o PIX como Mensalidade (valor total) ou rateie se o banco trouxe só um valor agregado com
              outros itens.
            </li>
            <li>
              <strong>Mensalidade + dívida à parte</strong> — rateie: uma parte Mensalidade e outra Acordo/dívida (ou
              baixe a mensalidade e a linha do acordo separadamente).
            </li>
            <li>
              <strong>Mês de cada parte Mensalidade</strong> — no <strong>Ratear</strong>, toda parte do tipo
              Mensalidade exige o associado e o <strong>mês que ela quita</strong> (a lista mostra só as cobranças
              pendentes e vencidas que já existem para o associado). É esse mês que fica pago na tela Mensalidades, não
              o mês do PIX; a pendência daquele mês é substituída.
            </li>
            <li>
              <strong>Família no mesmo PIX</strong> — rateie uma parte por associado (irmão), tipo Mensalidade, ou use a
              baixa em lote na tela Mensalidades se ainda forem lançamentos pendentes.
            </li>
          </ul>
          <p className="muted">
            O botão de calendário só aparece em créditos pagos, do tipo Mensalidade ou A identificar, ainda não rateados
            e cujo valor não corresponde a uma única mensalidade do associado. Para um mês só, basta
            Identificar/Alterar.
          </p>
          <p className="muted">
            Preferível: na Integração, antes de gravar, já marcar Mensalidade + associado — o sistema casa com a
            pendente e dá baixa sem duplicar. Não use “Marcar como pago” no crédito do extrato: ele já está pago.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-tabela.png",
        alt: "Tabela de lançamentos do caixa",
        caption:
          "Classifique o crédito pago ou baixe vários meses pelo botão de calendário; não confunda com Marcar como pago.",
      },
    },
    {
      id: "advance-and-debt",
      title: "Adiantamento, atraso e dívida no caixa",
      body: (
        <>
          <p>
            Se a mensalidade ainda está <strong>pendente</strong> no caixa (gerada pela grade), use{" "}
            <strong>Marcar como pago</strong>:
          </p>
          <ul>
            <li>
              Informe a data e, em <em>Baixar também outros meses (adiantamento)</em>, marque meses futuros ou atrasados
              que o mesmo pagamento cobre — o total aparece no modal.
            </li>
            <li>
              Linhas com marca de <strong>acordo embutido</strong> ou <strong>acordo / dívida</strong> mostram que há
              parcela de dívida ligada; ao baixar a mensalidade embutida, a parcela acompanha.
            </li>
          </ul>
          <p className="muted">
            Para forçar valor pontual vs atraso em lote, prefira a tela Mensalidades (Pagar pontual / Pagar com atraso).
            Acordos novos e quitação avulsa ficam na tela Dívidas.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-rateio.png",
        alt: "Modal de rateio ou confirmação de pagamento",
        caption: "Adiantamento no modal de pago; vários motivos no rateio.",
      },
    },
    {
      id: "duplicates",
      title: "Possíveis duplicados",
      body: (
        <>
          <p>
            O sistema não apaga mais nada sozinho. Lançamentos com o mesmo dia, valor e histórico (por exemplo, o mesmo
            Pix vindo do Sicredi e de uma planilha) aparecem em <strong>Possíveis duplicados</strong>.
          </p>
          <ul>
            <li>
              <strong>Excluir a cópia</strong> manda a cópia para a lixeira; o lançamento marcado como “Fica” continua.
            </li>
            <li>
              <strong>São diferentes</strong> mantém os dois e o par não é sugerido de novo.
            </li>
          </ul>
        </>
      ),
      media: {
        src: "/help/cash-flow-duplicados.png",
        alt: "Par de possíveis duplicados com as opções São diferentes e Excluir a cópia",
        caption: "Nada some sem alguém decidir.",
      },
    },
    {
      id: "split-guided",
      title: "Ratear com conferência",
      body: (
        <>
          <p>
            No <strong>Ratear</strong>, cada parte começa pelo tipo. A barra no topo mostra quanto do valor já foi
            distribuído e avisa <em>Faltam</em> ou <em>Passou</em>; o botão Ratear só libera quando a soma fecha.
          </p>
          <p className="muted">
            Em <strong>Este Pix quita</strong> você lê, parte por parte, o que o crédito paga (inclusive o mês de cada
            mensalidade) antes de salvar.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-ratear.png",
        alt: "Ratear com barra de distribuição mostrando quanto falta",
        caption: "A soma precisa fechar para salvar.",
      },
    },
    {
      id: "filters",
      title: "Filtros da lista",
      body: (
        <>
          <p>Na barra de filtros você pode combinar:</p>
          <ul>
            <li>Busca por descrição, associado ou tipo</li>
            <li>Entrada / saída</li>
            <li>Natureza (fixa ou variável)</li>
            <li>Ramo e tipo de movimentação</li>
            <li>Conciliação (conciliado ou não)</li>
            <li>Datas de vencimento e pagamento</li>
            <li>Com ou sem rateio</li>
          </ul>
        </>
      ),
    },
    {
      id: "row-actions",
      title: "Ações em cada linha",
      body: (
        <>
          <ul>
            <li>
              <strong>Marcar como pago</strong> — para lançamentos ainda pendentes (ex.: mensalidade da grade). Dá para
              incluir outros meses (adiantamento ou atrasados) e o total aparece no modal. No crédito do extrato que já
              veio pago, use Identificar/Alterar ou Ratear, não este botão.
            </li>
            <li>
              <strong>Alterar</strong> — edita todos os campos (incluindo classificar extrato sem tipo).
            </li>
            <li>
              <strong>Anexar nota</strong> — foto ou PDF de comprovante.
            </li>
            <li>
              <strong>Baixar mensalidades deste Pix</strong> (calendário) — só em crédito pago de mensalidade que cobre
              vários meses (adiantamento ou atrasados): você escolhe os meses, pontual ou com atraso, e o sistema rateia
              e dá baixa na grade.
            </li>
            <li>
              <strong>Ratear</strong> — parte um crédito em várias rubricas/associados (família, mensalidade + dívida à
              parte); a soma deve bater com o total. Partes do tipo Mensalidade pedem o mês que quitam.
            </li>
            <li>
              <strong>Histórico</strong> (relógio) — quem alterou o quê e quando.
            </li>
            <li>
              <strong>Excluir</strong> — envia para a lixeira, com Desfazer na hora e restauração por 30 dias.
            </li>
            <li>
              <strong>Mês fechado</strong> (cadeado) — lançamento pago de um mês fechado; só o admin reabre.
            </li>
          </ul>
          <p className="muted">Linhas rateadas aparecem em sanfona: o valor original e as partes ao expandir.</p>
        </>
      ),
      media: {
        src: "/help/cash-flow-tabela.png",
        alt: "Tabela de lançamentos com ações por linha",
        caption: "Ícones à direita de cada registro.",
      },
    },
    {
      id: "trash",
      title: "Excluir, desfazer e lixeira",
      body: (
        <>
          <p>
            Excluir não apaga de vez: aparece o aviso <strong>Lançamento enviado para a lixeira</strong> com o botão{" "}
            <strong>Desfazer</strong> por alguns segundos.
          </p>
          <p>
            Depois disso, abra <strong>Lixeira</strong> no topo da página: os excluídos ficam lá por 30 dias e podem ser
            restaurados. Só o admin pode esvaziar a lixeira.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-lixeira.png",
        alt: "Lixeira com dois lançamentos e o botão Restaurar",
        caption: "Restaure em até 30 dias.",
      },
    },
    {
      id: "history",
      title: "Histórico de alterações",
      body: (
        <>
          <p>
            O ícone de relógio em cada linha abre o <strong>histórico</strong>: quem alterou, quando e o que mudou, com
            o valor antigo riscado e o novo ao lado.
          </p>
          <p className="muted">Ajuda na prestação de contas e a desfazer enganos. Vale a partir de outubro de 2026.</p>
        </>
      ),
      media: {
        src: "/help/cash-flow-historico.png",
        alt: "Linha do tempo com alteração de valor e de situação",
        caption: "Antes riscado, depois em verde.",
      },
    },
    {
      id: "month-closing",
      title: "Fechar o mês",
      body: (
        <>
          <p>
            Com um mês já encerrado selecionado no período, aparece <strong>Fechar o mês</strong>. Depois de conferir,
            feche: os lançamentos <strong>pagos</strong> com vencimento naquele mês ficam só leitura (cadeado “mês
            fechado” na linha) e o saldo do momento fica guardado.
          </p>
          <ul>
            <li>Dar baixa numa mensalidade pendente do mês fechado continua permitido (pagamento atrasado).</li>
            <li>
              Só o <strong>admin</strong> reabre o mês.
            </li>
          </ul>
        </>
      ),
      media: {
        src: "/help/cash-flow-fechamento.png",
        alt: "Barra de fechamento de setembro com a confirmação",
        caption: "Feche depois de conferir; o admin pode reabrir.",
      },
    },
    {
      id: "one-pix-one-reason",
      title: "Um PIX, um motivo",
      body: (
        <>
          <p>
            O saldo só é confiável com o crédito no banco. Vários motivos no mesmo dia pedem PIX separados — ou um único
            crédito rateado aqui.
          </p>
          <ol>
            <li>
              <strong>Um PIX, um motivo</strong> — três QR Codes, três linhas já classificadas.
            </li>
            <li>
              <strong>Um PIX com a soma</strong> — ratear nas partes (associado, rubrica, valor).
            </li>
            <li>
              <strong>Cartão</strong> — identifique pela maquininha; a liquidação no Sicredi vem líquida depois.
            </li>
            <li>
              <strong>Comprovante</strong> — casa com a linha do extrato; não lança sozinho.
            </li>
          </ol>
        </>
      ),
      media: {
        src: "/help/cash-flow-rateio.png",
        alt: "Modal de rateio de lançamento",
        caption: "A soma das partes tem de bater centavo a centavo com o banco.",
      },
    },
  ],
};
