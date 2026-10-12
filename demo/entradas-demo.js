const inboundCost = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 10,
  });
let inbound = {
    tab: "entries",
    entries: [],
    orders: [],
    suppliers: [],
    products: [],
    filter: "",
    search: "",
  },
  inboundDraft = null,
  inboundSupplierCallback = null;
const inboundLabels = {
  RASCUNHO: "Rascunho",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  ENVIADO: "Enviado",
  PARCIALMENTE_RECEBIDO: "Parcialmente recebido",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
  MANUAL: "Entrada manual",
  XML: "XML NF-e",
  PEDIDO: "Pedido de entrada",
};
const inboundBadge = (status) =>
  '<span class="pill ' +
  (["CONFIRMADA", "RECEBIDO"].includes(status)
    ? "p-green"
    : ["CANCELADA", "CANCELADO"].includes(status)
      ? "p-red"
      : status === "RASCUNHO"
        ? "p-gray"
        : "p-blue") +
  '">' +
  escape(inboundLabels[status] || status) +
  "</span>";
const inField = (id, label, value = "", type = "text", extra = "") =>
  '<label class="fg">' +
  label +
  '<input class="in" id="' +
  id +
  '" type="' +
  type +
  '" value="' +
  escape(value ?? "") +
  '" ' +
  extra +
  "></label>";
const inSelect = (id, label, options, value) =>
  '<label class="fg">' +
  label +
  '<select class="in" id="' +
  id +
  '">' +
  options
    .map(
      ([id, label]) =>
        '<option value="' +
        escape(id) +
        '" ' +
        (String(id) === String(value) ? "selected" : "") +
        ">" +
        escape(label) +
        "</option>",
    )
    .join("") +
  "</select></label>";
async function inboundAction(button, task) {
  button.disabled = true;
  try {
    return await task();
  } catch (error) {
    if (error.name !== "AbortError") toast(error.message, true);
  } finally {
    button.disabled = false;
  }
}
async function loadEntries() {
  const [entries, orders, suppliers, products] = await Promise.all([
    demoData("/entries"),
    demoData("/purchase-orders"),
    demoData("/suppliers"),
    demoData("/products"),
  ]);
  Object.assign(inbound, { entries, orders, suppliers, products });
  drawInbound();
}
function drawInbound() {
  const host = document.querySelector("#inbound-content");
  if (!host) return;
  const orders = inbound.tab === "orders",
    all = orders ? inbound.orders : inbound.entries,
    list = all.filter(
      (item) =>
        (!inbound.filter || item.status === inbound.filter) &&
        correspondeBusca(item, inbound.search, [
          "numero",
          "fornecedor_nome",
          "fornecedor_documento",
          "numero_documento",
          "chave_acesso",
          "numero_pedido",
        ]),
    );
  const valid = all.filter(
    (item) => !["CANCELADA", "CANCELADO"].includes(item.status),
  );
  document.querySelector("#inbound-stats").innerHTML =
    metric(
      orders ? "Pedidos cadastrados" : "Notas de entrada",
      all.length,
      "registros persistidos",
    ) +
    metric(
      orders ? "A receber" : "Confirmadas",
      all.filter((item) =>
        orders
          ? ["ENVIADO", "PARCIALMENTE_RECEBIDO"].includes(item.status)
          : item.status === "CONFIRMADA",
      ).length,
      orders ? "pedidos em andamento" : "estoque atualizado",
      "teal",
    ) +
    metric(
      "Valor " + (orders ? "previsto" : "das entradas"),
      money(amountSum(valid, "total")),
      "sem cancelamentos",
      "violet",
    ) +
    metric(
      "Rascunhos",
      all.filter((item) => item.status === "RASCUNHO").length,
      "aguardando revisão",
      "amber",
    );
  document
    .querySelectorAll("[data-inbound-tab]")
    .forEach((button) =>
      button.classList.toggle("on", button.dataset.inboundTab === inbound.tab),
    );
  document.querySelector("#inbound-status").innerHTML =
    '<option value="">Todas as situações</option>' +
    (orders
      ? [
          "RASCUNHO",
          "ENVIADO",
          "PARCIALMENTE_RECEBIDO",
          "RECEBIDO",
          "CANCELADO",
        ]
      : ["RASCUNHO", "CONFIRMADA", "CANCELADA"]
    )
      .map(
        (status) =>
          '<option value="' +
          status +
          '" ' +
          (status === inbound.filter ? "selected" : "") +
          ">" +
          inboundLabels[status] +
          "</option>",
      )
      .join("");
  host.innerHTML =
    '<div class="tbl table-scroll"><table><thead><tr><th>Número / data</th><th>Fornecedor / CPF ou CNPJ</th><th>' +
    (orders ? "Previsão de entrega" : "Documento / origem") +
    "</th><th>Total " +
    (orders ? "previsto" : "") +
    "</th><th>Situação</th><th>Ações</th></tr></thead><tbody>" +
    list
      .map(
        (item) =>
          "<tr><td><b>#" +
          item.numero +
          "</b><small>" +
          formatDate(orders ? item.data : item.data_entrada) +
          "</small></td><td><b>" +
          escape(item.fornecedor_nome) +
          "</b><small>" +
          escape(item.fornecedor_documento || "Sem documento") +
          "</small></td><td>" +
          escape(
            orders
              ? formatDate(item.previsao_entrega)
              : item.numero_documento || "Sem documento",
          ) +
          "<small>" +
          (orders ? "" : escape(inboundLabels[item.origem])) +
          '</small></td><td class="money">' +
          money(item.total) +
          "</td><td>" +
          inboundBadge(item.status) +
          '</td><td><button class="btn sm" data-inbound-action="details" data-id="' +
          item.id +
          '">Detalhes</button>' +
          (![
            "CANCELADO",
            "CANCELADA",
            "RECEBIDO",
            "PARCIALMENTE_RECEBIDO",
          ].includes(item.status)
            ? '<button class="btn sm" data-inbound-action="edit" data-id="' +
              item.id +
              '">Editar</button>'
            : "") +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table>" +
    (!list.length
      ? '<p class="empty-row"><b>Nenhum registro encontrado</b>Crie uma entrada ou ajuste os filtros.</p>'
      : "") +
    "</div>";

  host.querySelector(".table-scroll").classList.add("inbound-desktop-list");
  const mobile = document.createElement("div");
  mobile.className = "tbl inbound-mobile-list";
  mobile.innerHTML =
    list
      .map(
        (item) =>
          '<article class="tr"><div class="c-main"><div><b>' +
          escape(item.fornecedor_nome) +
          "</b><small>#" +
          item.numero +
          " · " +
          formatDate(orders ? item.data : item.data_entrada) +
          "</small><small>" +
          escape(
            orders
              ? "Entrega: " + formatDate(item.previsao_entrega)
              : (item.numero_documento
                  ? "NF-e " + item.numero_documento
                  : "Sem documento") +
                  " · " +
                  inboundLabels[item.origem],
          ) +
          '</small></div></div><div class="c-end"><span class="money">' +
          money(item.total) +
          "</span>" +
          inboundBadge(item.status) +
          '</div><div class="inbound-mobile-actions"><button class="btn sm" data-inbound-action="details" data-id="' +
          item.id +
          '">Detalhes</button>' +
          (![
            "CANCELADO",
            "CANCELADA",
            "RECEBIDO",
            "PARCIALMENTE_RECEBIDO",
          ].includes(item.status)
            ? '<button class="btn sm" data-inbound-action="edit" data-id="' +
              item.id +
              '">Editar</button>'
            : "") +
          "</div></article>",
      )
      .join("") || '<p class="empty-row">Nenhum registro encontrado.</p>';
  host.append(mobile);
  host.querySelectorAll("[data-inbound-action]").forEach(
    (button) =>
      (button.onclick = () =>
        inboundAction(button, async () => {
          const kind = orders ? "order" : "entry",
            data = await demoData(
              (orders ? "/purchase-orders/" : "/entries/") + button.dataset.id,
            );
          if (button.dataset.inboundAction === "edit")
            openInboundEditor(kind, data);
          else openInboundDetail(kind, data);
        })),
  );
  document.querySelectorAll("[data-inbound-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        inbound.tab = button.dataset.inboundTab;
        inbound.filter = "";
        drawInbound();
      }),
  );
  document.querySelector("#inbound-status").onchange = (event) => {
    inbound.filter = event.target.value;
    drawInbound();
  };
  document.querySelector("#inbound-search").oninput = (event) => {
    inbound.search = event.target.value;
    drawInbound();
  };
  document.querySelector("#new-inbound").onclick = openInboundChoice;
  document.querySelector("#manage-suppliers").onclick = () =>
    openSupplierManager();
  hydrateIcons(host);
}
function openInboundChoice() {
  const dialog = document.querySelector("#inbound-choice");
  dialog.showModal();
  dialog.querySelector('[data-inbound-new="manual"]').onclick = () => {
    dialog.close();
    openInboundEditor("entry");
  };
  dialog.querySelector('[data-inbound-new="order"]').onclick = () => {
    dialog.close();
    openInboundEditor("order");
  };
  const file = document.querySelector("#inbound-xml-file");
  file.value = "";
  file.onchange = () => demoNotice();
}
function openSupplierManager(prefill = {}, onSaved = null) {
  inboundSupplierCallback = onSaved;
  const dialog = document.querySelector("#inbound-supplier-dialog");
  dialog.querySelector("#supplier-dialog-body").innerHTML =
    '<div class="toolbar"><label class="search">' +
    ic("search", 18) +
    '<input id="supplier-search" placeholder="Buscar nome, CPF/CNPJ ou telefone"></label><button class="btn" type="button" id="supplier-reset">Novo fornecedor</button></div><div id="supplier-matches" class="supplier-matches"></div><form id="supplier-form"><input type="hidden" id="supplier-id"><div class="form-grid">' +
    inField(
      "supplier-name",
      "Nome / razão social",
      prefill.nome,
      "text",
      "required",
    ) +
    inField("supplier-document", "CPF / CNPJ", prefill.cpf_cnpj) +
    inField("supplier-phone", "Telefone", prefill.telefone) +
    inField("supplier-email", "E-mail (opcional)", prefill.email, "email") +
    '<div class="wide">' +
    inField("supplier-address", "Endereço (opcional)", prefill.endereco) +
    '</div><label class="fg wide">Observações<textarea class="in" id="supplier-note">' +
    escape(prefill.observacao || "") +
    '</textarea></label></div><p id="supplier-status" class="form-status"></p><div class="dialog-actions"><button class="btn primary" type="submit" id="supplier-save">Salvar fornecedor</button></div></form>';
  const draw = () => {
    const term = document.querySelector("#supplier-search").value;
    document.querySelector("#supplier-matches").innerHTML = inbound.suppliers
      .filter((s) =>
        correspondeBusca(s, term, ["nome", "cpf_cnpj", "telefone"]),
      )
      .slice(0, 8)
      .map(
        (s) =>
          '<button type="button" class="command-item" data-supplier-edit="' +
          s.id +
          '"><span><b>' +
          escape(s.nome) +
          "</b><small>" +
          escape([s.cpf_cnpj, s.telefone].filter(Boolean).join(" · ")) +
          "</small></span></button>",
      )
      .join("");
    dialog.querySelectorAll("[data-supplier-edit]").forEach(
      (button) =>
        (button.onclick = () => {
          const s = inbound.suppliers.find(
            (s) => String(s.id) === button.dataset.supplierEdit,
          );
          for (const [id, key] of [
            ["id", "id"],
            ["name", "nome"],
            ["document", "cpf_cnpj"],
            ["phone", "telefone"],
            ["email", "email"],
            ["address", "endereco"],
            ["note", "observacao"],
          ])
            document.querySelector("#supplier-" + id).value = s[key] || "";
        }),
    );
  };
  document.querySelector("#supplier-search").oninput = draw;
  draw();
  document.querySelector("#supplier-reset").onclick = () =>
    document.querySelector("#supplier-form").reset();
  document.querySelector("#supplier-form").onsubmit = (event) => {
    event.preventDefault();
    inboundAction(document.querySelector("#supplier-save"), async () => {
      const value = (id) => document.querySelector("#supplier-" + id).value,
        data = {
          nome: value("name"),
          cpf_cnpj: value("document"),
          telefone: value("phone"),
          email: value("email"),
          endereco: value("address"),
          observacao: value("note"),
        },
        id = value("id"),
        result = await demoData("/suppliers" + (id ? "/" + id : ""), {
          method: id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
      inbound.suppliers = await demoData("/suppliers");
      dialog.close();
      toast(
        result.existente
          ? "Fornecedor existente selecionado."
          : "Fornecedor salvo.",
      );
      inboundSupplierCallback?.(result);
    });
  };
  dialog.showModal();
}
function openInboundEditor(kind, source = {}) {
  const order = kind === "order";
  inboundDraft = {
    ...source,
    kind,
    requisicao_id: source.requisicao_id || crypto.randomUUID(),
    fornecedor_id: source.fornecedor_id || "",
    itens: (source.itens || []).map((i) => ({
      ...i,
      novo_produto:
        typeof i.novo_produto === "string"
          ? JSON.parse(i.novo_produto)
          : i.novo_produto,
    })),
    financeiro: source.financeiro || {
      gerar: false,
      quantidade: 1,
      intervalo: 30,
    },
    data: source.data || dateKey(),
    data_entrada: source.data_entrada || dateKey(),
  };
  if (!inboundDraft.itens.length)
    inboundDraft.itens.push({
      produto_id: null,
      descricao: "",
      unidade: "UN",
      quantidade: 1,
      custo_unitario: 0,
      desconto: 0,
    });
  const dialog = document.querySelector("#inbound-editor");
  dialog.querySelector("#inbound-editor-title").textContent =
    (source.id ? "Editar " : order ? "Novo " : "Nova ") +
    (order ? "pedido de entrada" : "entrada") +
    (source.numero ? " #" + source.numero : "");
  drawInboundEditor();
  dialog.showModal();
  dialog.scrollTop = 0;
}
function supplierOptions(selected) {
  return [
    ["", "Selecione o fornecedor"],
    ...inbound.suppliers.map((s) => [
      s.id,
      s.nome + (s.cpf_cnpj ? " · " + s.cpf_cnpj : ""),
    ]),
  ]
    .map(
      ([id, label]) =>
        '<option value="' +
        id +
        '" ' +
        (String(id) === String(selected) ? "selected" : "") +
        ">" +
        escape(label) +
        "</option>",
    )
    .join("");
}
function drawInboundEditor() {
  const d = inboundDraft,
    order = d.kind === "order",
    body = document.querySelector("#inbound-editor-body");
  body.innerHTML =
    (d.origem === "XML"
      ? '<div class="alert ok"><div class="ai">' +
        ic("file") +
        '</div><div class="at"><b>Conferência da NF-e ' +
        escape(d.numero_documento) +
        "</b><small>Vincule cada item e confira os dados. Preços de venda existentes serão preservados.</small>" +
        (d.ajuste_fiscal
          ? "<small>Tributos/ajuste fiscal incluídos nas despesas: " +
            money(d.ajuste_fiscal) +
            "</small>"
          : "") +
        "</div></div>"
      : "") +
    (d.status === "CONFIRMADA"
      ? '<p class="note">Salvar uma entrada confirmada recalcula estoque, custo e contas em uma única operação. Contas baixadas impedem a alteração.</p>'
      : "") +
    '<section class="card"><header class="card-h"><h3>Fornecedor e documento</h3><span>' +
    escape(order ? "Pedido de entrada" : inboundLabels[d.origem || "MANUAL"]) +
    '</span></header><div class="card-b form-grid"><div class="wide supplier-picker"><label class="search">' +
    ic("search", 18) +
    '<input id="inbound-supplier-search" placeholder="Buscar fornecedor por nome, documento ou telefone"></label><select class="in" id="inbound-supplier" aria-label="Fornecedor">' +
    supplierOptions(d.fornecedor_id) +
    '</select><button class="btn" type="button" id="inbound-new-supplier">' +
    ic("userplus", 18) +
    "Fornecedor</button></div>" +
    inField(
      order ? "inbound-date" : "inbound-arrival",
      order ? "Data do pedido" : "Data da entrada",
      order ? d.data : d.data_entrada,
      "date",
      "required",
    ) +
    (order
      ? inField(
          "inbound-expected",
          "Previsão de entrega",
          d.previsao_entrega,
          "date",
        )
      : inField("inbound-issue", "Data de emissão", d.data_emissao, "date") +
        inField(
          "inbound-document",
          "Número da NF-e / documento (opcional)",
          d.numero_documento,
        ) +
        inField("inbound-series", "Série", d.serie) +
        inField(
          "inbound-order-number",
          "Número do pedido (opcional)",
          d.numero_pedido,
        ) +
        '<div class="wide">' +
        inField(
          "inbound-key",
          "Chave de acesso (44 dígitos)",
          d.chave_acesso,
          "text",
          d.origem === "XML" ? "readonly" : "",
        ) +
        "</div>") +
    '<label class="fg wide">Observação<textarea id="inbound-note" class="in">' +
    escape(d.observacao || "") +
    '</textarea></label></div></section><section class="card"><header class="card-h"><h3>Produtos ' +
    (order ? "solicitados" : "recebidos") +
    '</h3><button class="btn sm" type="button" id="inbound-add-item">' +
    ic("plus", 16) +
    'Adicionar produto</button></header><div id="inbound-item-list" class="card-b inbound-item-list"></div></section><section class="card"><header class="card-h"><h3>Valores e ' +
    (order ? "previsão" : "contas a pagar") +
    '</h3></header><div class="card-b form-grid">' +
    inField(
      "inbound-discount",
      "Desconto geral (R$)",
      d.desconto || 0,
      "number",
      'min="0" step="0.01"',
    ) +
    inField(
      "inbound-freight",
      "Frete (R$)",
      d.frete || 0,
      "number",
      'min="0" step="0.01"',
    ) +
    inField(
      "inbound-other",
      "Outras despesas (R$)",
      d.outras_despesas || 0,
      "number",
      'min="0" step="0.01"',
    ) +
    '<div class="inbound-total"><small>Total ' +
    (order ? "previsto" : "da entrada") +
    '</small><strong id="inbound-total">—</strong></div>' +
    (!order
      ? '<label class="inbound-check wide"><input type="checkbox" id="inbound-generate" ' +
        (d.financeiro.gerar ? "checked" : "") +
        '>Gerar contas a pagar ao confirmar</label><div id="inbound-finance" class="wide form-grid" ' +
        (!d.financeiro.gerar ? "hidden" : "") +
        ">" +
        inField(
          "inbound-pay-total",
          "Valor a pagar (R$)",
          d.financeiro.valor_total ?? "",
          "number",
          'min="0.01" step="0.01"',
        ) +
        inField(
          "inbound-installments",
          "Quantidade de parcelas",
          d.financeiro.quantidade || 1,
          "number",
          'min="1" max="120"',
        ) +
        inField(
          "inbound-first-due",
          "Primeiro vencimento",
          d.financeiro.primeiro_vencimento,
          "date",
        ) +
        inField(
          "inbound-interval",
          "Intervalo entre parcelas (dias)",
          d.financeiro.intervalo || 30,
          "number",
          'min="1" max="366"',
        ) +
        inField(
          "inbound-bank",
          "Banco / forma prevista",
          d.financeiro.banco_previsto,
        ) +
        inField(
          "inbound-finance-note",
          "Observação financeira",
          d.financeiro.observacao,
        ) +
        '<div id="inbound-installment-preview" class="wide note"></div></div>'
      : "") +
    "</div></section>";
  const binding = [
    ["inbound-supplier", "fornecedor_id"],
    ["inbound-date", "data"],
    ["inbound-arrival", "data_entrada"],
    ["inbound-expected", "previsao_entrega"],
    ["inbound-issue", "data_emissao"],
    ["inbound-document", "numero_documento"],
    ["inbound-series", "serie"],
    ["inbound-order-number", "numero_pedido"],
    ["inbound-key", "chave_acesso"],
    ["inbound-note", "observacao"],
    ["inbound-discount", "desconto"],
    ["inbound-freight", "frete"],
    ["inbound-other", "outras_despesas"],
  ];
  for (const [id, key] of binding) {
    const el = document.querySelector("#" + id);
    if (el)
      el.oninput = () => {
        d[key] = el.type === "number" ? Number(el.value) : el.value;
        updateInboundTotal();
      };
  }
  document.querySelector("#inbound-supplier-search").oninput = (event) => {
    const select = document.querySelector("#inbound-supplier");
    select.innerHTML = supplierOptions(d.fornecedor_id);
    [...select.options].forEach((option) => {
      const s = inbound.suppliers.find((s) => String(s.id) === option.value);
      option.hidden = Boolean(
        s &&
          !correspondeBusca(s, event.target.value, [
            "nome",
            "cpf_cnpj",
            "telefone",
          ]),
      );
    });
  };
  document.querySelector("#inbound-new-supplier").onclick = () =>
    openSupplierManager(d.fornecedor_xml || {}, (supplier) => {
      d.fornecedor_id = supplier.id;
      document.querySelector("#inbound-supplier").innerHTML = supplierOptions(
        supplier.id,
      );
    });
  document.querySelector("#inbound-add-item").hidden = Boolean(d.pedido_id);
  document.querySelector("#inbound-add-item").onclick = () => {
    d.itens.push({
      produto_id: null,
      descricao: "",
      quantidade: 1,
      custo_unitario: 0,
      desconto: 0,
      unidade: "UN",
    });
    drawInboundItems();
  };
  if (!order) {
    document.querySelector("#inbound-generate").onchange = (event) => {
      d.financeiro.gerar = event.target.checked;
      document.querySelector("#inbound-finance").hidden = !event.target.checked;
      updateInboundTotal();
    };
    for (const [id, key] of [
      ["pay-total", "valor_total"],
      ["installments", "quantidade"],
      ["first-due", "primeiro_vencimento"],
      ["interval", "intervalo"],
      ["bank", "banco_previsto"],
      ["finance-note", "observacao"],
    ]) {
      const el = document.querySelector("#inbound-" + id);
      el.oninput = () => {
        d.financeiro[key] = el.type === "number" ? Number(el.value) : el.value;
        updateInboundTotal();
      };
    }
  }
  document.querySelector("#inbound-save-draft").hidden =
    d.status === "CONFIRMADA";
  document.querySelector("#inbound-save-confirm").textContent = order
    ? d.id
      ? "Salvar pedido"
      : "Criar pedido"
    : d.status === "CONFIRMADA"
      ? "Salvar alterações"
      : "Confirmar entrada";
  document.querySelector("#inbound-save-draft").onclick = (event) =>
    saveInboundEditor(event.target, false);
  document.querySelector("#inbound-save-confirm").onclick = (event) =>
    saveInboundEditor(event.target, !order);
  drawInboundItems();
  hydrateIcons(body);
}
function drawInboundItems() {
  const d = inboundDraft,
    list = document.querySelector("#inbound-item-list");
  list.innerHTML = d.itens
    .map(
      (item, index) =>
        '<article class="inbound-line" data-inbound-line="' +
        index +
        '"><header><b>Item ' +
        (index + 1) +
        " · " +
        escape(item.descricao || "Selecione um produto") +
        '</b><button class="btn sm danger" type="button" data-remove-item="' +
        index +
        '">Remover</button></header><div class="form-grid"><label class="fg wide">Vincular produto' +
        (item.ean ? " · EAN " + escape(item.ean) : "") +
        (item.codigo_fornecedor
          ? " · Código fornecedor " + escape(item.codigo_fornecedor)
          : "") +
        '<input class="in inbound-product-search" data-index="' +
        index +
        '" placeholder="Buscar por nome, código ou EAN"><select class="in inbound-product" data-index="' +
        index +
        '" ' +
        (d.pedido_id ? "disabled" : "") +
        '><option value="">Selecione um produto</option>' +
        (!d.pedido_id
          ? '<option value="new" ' +
            (item.novo_produto && !item.produto_id ? "selected" : "") +
            ">Criar novo produto ao confirmar</option>"
          : "") +
        inbound.products
          .map(
            (p) =>
              '<option value="' +
              p.id +
              '" ' +
              (String(item.produto_id) === String(p.id) ? "selected" : "") +
              ">" +
              escape(p.descricao) +
              " · " +
              escape(p.codigo || "") +
              "</option>",
          )
          .join("") +
        "</select>" +
        (!d.pedido_id
          ? '<button class="btn sm" type="button" data-inbound-quick-product="' +
            index +
            '">+ Cadastro rápido de produto</button>'
          : "") +
        "</label>" +
        inField(
          "inbound-item-description-" + index,
          "Descrição",
          item.descricao,
          "text",
          'data-item-field="descricao" data-index="' + index + '"',
        ) +
        inField(
          "inbound-item-unit-" + index,
          "Unidade",
          item.unidade || "UN",
          "text",
          'data-item-field="unidade" data-index="' + index + '"',
        ) +
        inField(
          "inbound-item-qty-" + index,
          "Quantidade" +
            (item.pendente !== undefined ? " · pendente " + item.pendente : ""),
          item.quantidade,
          "number",
          'min="0.000001" step="any" data-item-field="quantidade" data-index="' +
            index +
            '"',
        ) +
        inField(
          "inbound-item-cost-" + index,
          d.kind === "order" ? "Custo previsto" : "Custo unitário",
          item.custo_unitario,
          "number",
          'min="0" step="any" data-item-field="custo_unitario" data-index="' +
            index +
            '"',
        ) +
        inField(
          "inbound-item-discount-" + index,
          "Desconto do item (R$)",
          item.desconto || 0,
          "number",
          'min="0" step="0.01" data-item-field="desconto" data-index="' +
            index +
            '"',
        ) +
        '<div class="inbound-line-total"><small>Total do item</small><b data-item-total="' +
        index +
        '">—</b></div>' +
        (item.novo_produto && !item.produto_id
          ? inField(
              "inbound-item-ean-" + index,
              "EAN / código de barras",
              item.ean,
              "text",
              'data-item-field="ean" data-index="' + index + '"',
            ) +
            inField(
              "inbound-item-ncm-" + index,
              "NCM",
              item.ncm,
              "text",
              'data-item-field="ncm" data-index="' + index + '"',
            ) +
            inField(
              "inbound-item-sale-" + index,
              "Preço de venda do novo produto",
              item.novo_produto.preco || 0,
              "number",
              'min="0" step="0.01" data-new-field="preco" data-index="' +
                index +
                '"',
            ) +
            inField(
              "inbound-item-category-" + index,
              "Categoria do novo produto",
              item.novo_produto.categoria || "",
              "text",
              'data-new-field="categoria" data-index="' + index + '"',
            )
          : "") +
        "</div></article>",
    )
    .join("");
  list.querySelectorAll("[data-remove-item]").forEach(
    (button) =>
      (button.onclick = () => {
        if (d.itens.length === 1)
          return toast("A entrada precisa de pelo menos um item.", true);
        d.itens.splice(Number(button.dataset.removeItem), 1);
        drawInboundItems();
      }),
  );
  list
    .querySelectorAll("[data-inbound-quick-product]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openInboundQuickProduct(Number(button.dataset.inboundQuickProduct))),
    );
  list.querySelectorAll(".inbound-product").forEach(
    (select) =>
      (select.onchange = () => {
        const item = d.itens[Number(select.dataset.index)],
          product = inbound.products.find((p) => String(p.id) === select.value);
        if (select.value === "new") {
          item.produto_id = null;
          item.novo_produto = { preco: 0, categoria: "" };
        } else {
          item.produto_id = product?.id || null;
          item.novo_produto = null;
          if (product) {
            item.descricao = product.descricao;
            item.unidade = product.unidade;
            item.ean = product.ean || item.ean;
            item.ncm = product.ncm || item.ncm;
            if (!item.custo_unitario)
              item.custo_unitario = Number(product.preco_custo || 0);
          }
        }
        drawInboundItems();
      }),
  );
  list.querySelectorAll(".inbound-product-search").forEach(
    (input) =>
      (input.oninput = () => {
        const select = list.querySelector(
          '.inbound-product[data-index="' + input.dataset.index + '"]',
        );
        [...select.options].forEach((option) => {
          const p = inbound.products.find((p) => String(p.id) === option.value);
          option.hidden = Boolean(
            p &&
              !correspondeBusca(p, input.value, ["descricao", "codigo", "ean"]),
          );
        });
      }),
  );
  list.querySelectorAll("[data-item-field]").forEach(
    (input) =>
      (input.oninput = () => {
        d.itens[Number(input.dataset.index)][input.dataset.itemField] =
          input.type === "number" ? Number(input.value) : input.value;
        updateInboundTotal();
      }),
  );
  list.querySelectorAll("[data-new-field]").forEach(
    (input) =>
      (input.oninput = () => {
        d.itens[Number(input.dataset.index)].novo_produto[
          input.dataset.newField
        ] = input.type === "number" ? Number(input.value) : input.value;
      }),
  );
  updateInboundTotal();
}
function updateInboundTotal() {
  const d = inboundDraft,
    total =
      d.itens.reduce(
        (sum, i) =>
          sum +
          Math.round(
            (Number(i.quantidade || 0) * Number(i.custo_unitario || 0) -
              Number(i.desconto || 0) +
              Number.EPSILON) *
              100,
          ) /
            100,
        0,
      ) -
      Number(d.desconto || 0) +
      Number(d.frete || 0) +
      Number(d.outras_despesas || 0);
  document.querySelector("#inbound-total").textContent = money(total);
  document.querySelectorAll("[data-item-total]").forEach((el) => {
    const i = d.itens[Number(el.dataset.itemTotal)];
    el.textContent = money(i.quantidade * i.custo_unitario - (i.desconto || 0));
  });
  if (d.kind === "entry") {
    if (d.financeiro.valor_total === undefined) {
      document.querySelector("#inbound-pay-total").value = Number(
        total.toFixed(2),
      );
    }
    const f = d.financeiro;
    document.querySelector("#inbound-installment-preview").textContent = f.gerar
      ? (f.quantidade || 1) +
        " parcelas · total " +
        money(f.valor_total ?? total) +
        (f.primeiro_vencimento
          ? " · a partir de " + formatDate(f.primeiro_vencimento)
          : " · informe o primeiro vencimento")
      : "";
  }
}
async function saveInboundEditor(button, confirmEntry) {
  const d = inboundDraft;
  if (!d.fornecedor_id)
    return toast("Selecione ou cadastre o fornecedor.", true);
  if (d.itens.some((i) => !i.produto_id && !i.novo_produto))
    return toast("Vincule todos os produtos ou marque-os como novos.", true);
  if (
    d.kind === "entry" &&
    d.financeiro.gerar &&
    d.financeiro.valor_total === undefined
  )
    d.financeiro.valor_total = parseAmount(
      document.querySelector("#inbound-pay-total").value,
    );
  await inboundAction(button, async () => {
    document.querySelector("#inbound-save-draft").disabled = true;
    document.querySelector("#inbound-save-confirm").disabled = true;
    try {
      const result = await demoData(
        (d.kind === "order" ? "/purchase-orders" : "/entries") +
          (d.id ? "/" + d.id : ""),
        {
          method: d.id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...d, confirmar: confirmEntry }),
        },
      );
      document.querySelector("#inbound-editor").close();
      productCache = null;
      inbound.tab = d.kind === "order" ? "orders" : "entries";
      await loadEntries();
      openInboundDetail(d.kind, result);
      toast(
        d.kind === "order"
          ? "Pedido salvo."
          : result.status === "CONFIRMADA"
            ? "Entrada confirmada. Estoque e contas atualizados."
            : "Rascunho salvo.",
      );
    } finally {
      document.querySelector("#inbound-save-draft").disabled = false;
      document.querySelector("#inbound-save-confirm").disabled = false;
    }
  });
}
function openInboundDetail(kind, d) {
  const linkedHTML =
    kind === "order"
      ? d.entradas
          .map(
            (e) =>
              '<button class="mi" data-detail-entry="' +
              e.id +
              '"><span class="mi-m"><b>Entrada #' +
              e.numero +
              "</b><small>" +
              formatDate(e.data_entrada) +
              " · " +
              escape(inboundLabels[e.status]) +
              "</small></span><b>" +
              money(e.total) +
              "</b></button>",
          )
          .join("")
      : d.contas
          .map(
            (c) =>
              '<div class="mi"><span class="mi-m"><b>Parcela ' +
              c.parcela +
              "</b><small>" +
              formatDate(c.vencimento) +
              " · " +
              escape(c.banco_previsto || "") +
              " · " +
              escape(c.status) +
              "</small></span><b>" +
              money(c.valor) +
              "</b></div>",
          )
          .join("");
  const order = kind === "order",
    dialog = document.querySelector("#inbound-detail");
  dialog.querySelector("#inbound-detail-title").textContent =
    (order ? "Pedido de entrada" : "Entrada") + " #" + d.numero;
  dialog.querySelector("#inbound-detail-body").innerHTML =
    '<div class="detail-meta"><span>Criado em ' +
    formatDocumentDate(d.criado_em) +
    "</span>" +
    inboundBadge(d.status) +
    '</div><section class="detail-customer"><b>' +
    escape(d.fornecedor.nome) +
    "</b><span>" +
    escape(
      [d.fornecedor.cpf_cnpj, d.fornecedor.telefone, d.fornecedor.email]
        .filter(Boolean)
        .join(" · "),
    ) +
    "</span><small>" +
    escape(d.fornecedor.endereco || "") +
    '</small></section><div class="kv"><div><small>' +
    (order ? "Data / previsão" : "Entrada / emissão") +
    "</small><b>" +
    formatDate(order ? d.data : d.data_entrada) +
    " / " +
    formatDate(order ? d.previsao_entrega : d.data_emissao) +
    "</b></div><div><small>" +
    (order ? "Fornecedor" : "Documento / série / origem") +
    "</small><b>" +
    escape(
      order
        ? d.fornecedor.nome
        : [
            d.numero_documento || "Sem documento",
            d.serie,
            inboundLabels[d.origem],
          ]
            .filter(Boolean)
            .join(" · "),
    ) +
    "</b></div></div>" +
    (d.chave_acesso
      ? '<p class="note inbound-key">Chave da NF-e: ' +
        escape(d.chave_acesso) +
        "</p>"
      : "") +
    (d.pedido_id
      ? '<p class="note">Pedido de origem #' +
        d.pedido_numero +
        ' <button class="btn sm" id="detail-origin-order">Abrir pedido</button></p>'
      : "") +
    '<div class="table-scroll"><table><thead><tr><th>Produto / unidade</th><th>' +
    (order ? "Solicitada" : "Quantidade") +
    "</th><th>Custo</th><th>" +
    (order ? "Recebida / pendente" : "Desconto") +
    "</th><th>Total</th></tr></thead><tbody>" +
    d.itens
      .map(
        (i) =>
          "<tr><td>" +
          escape(i.descricao) +
          "<small>" +
          escape(i.unidade) +
          (i.ean ? " · EAN " + escape(i.ean) : "") +
          (i.ncm ? " · NCM " + escape(i.ncm) : "") +
          "</small></td><td>" +
          i.quantidade +
          "</td><td>" +
          inboundCost(i.custo_unitario) +
          "</td><td>" +
          (order
            ? i.recebido +
              " / " +
              Number((i.quantidade - i.recebido).toFixed(6))
            : money(i.desconto)) +
          "</td><td>" +
          money(i.quantidade * i.custo_unitario - i.desconto) +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table></div><div class="inbound-summary"><div>Desconto geral <b>' +
    money(d.desconto) +
    "</b></div><div>Frete <b>" +
    money(d.frete) +
    "</b></div><div>Outras despesas <b>" +
    money(d.outras_despesas) +
    '</b></div><div class="total">Total <strong>' +
    money(d.total) +
    '</strong></div></div><p class="note">' +
    escape(d.observacao || "Sem observações.") +
    "</p><h3>" +
    (order ? "Entradas vinculadas" : "Contas a pagar vinculadas") +
    '</h3><div class="mini-list">' +
    (linkedHTML ||
      '<p class="note">Nenhum vínculo financeiro ou de recebimento.</p>') +
    "</div>";
  const actions = [
    ["print", "Imprimir"],
    ...(![
      "CANCELADO",
      "CANCELADA",
      "PARCIALMENTE_RECEBIDO",
      "RECEBIDO",
    ].includes(d.status)
      ? [["edit", "Editar"]]
      : []),
    ...(d.status === "RASCUNHO"
      ? [
          [
            order ? "send" : "confirm",
            order ? "Marcar como enviado" : "Confirmar entrada",
          ],
          ["delete", "Excluir rascunho"],
        ]
      : []),
    ...(order ? [["duplicate", "Duplicar"]] : []),
    ...(order && ["ENVIADO", "PARCIALMENTE_RECEBIDO"].includes(d.status)
      ? [["receive", "Receber produtos"]]
      : []),
    ...(!["CANCELADO", "CANCELADA"].includes(d.status)
      ? [["cancel", "Cancelar"]]
      : []),
  ];
  dialog.querySelector("#inbound-detail-actions").innerHTML = actions
    .map(
      ([action, label]) =>
        '<button type="button" class="btn ' +
        (action === "cancel" || action === "delete"
          ? "danger"
          : action === "confirm" || action === "receive"
            ? "primary"
            : "") +
        '" data-detail-action="' +
        action +
        '">' +
        label +
        "</button>",
    )
    .join("");
  dialog.querySelectorAll("[data-detail-action]").forEach(
    (button) =>
      (button.onclick = () =>
        inboundAction(button, async () => {
          const action = button.dataset.detailAction;
          if (action === "print") return printInbound(kind, d);
          if (action === "edit") {
            dialog.close();
            return openInboundEditor(kind, d);
          }
          if (action === "receive") {
            dialog.close();
            return receiveInboundOrder(d);
          }
          if (
            ["cancel", "delete"].includes(action) &&
            !confirm(
              (action === "cancel" ? "Cancelar" : "Excluir rascunho") +
                " #" +
                d.numero +
                "? " +
                (action === "cancel" && !order && d.status === "CONFIRMADA"
                  ? "O estoque recebido será estornado e contas pendentes serão removidas."
                  : order && action === "cancel"
                    ? "As entradas já recebidas e suas contas permanecem válidas; novas entregas serão bloqueadas."
                    : ""),
            )
          )
            return;
          const result = await demoData(
            (order ? "/purchase-orders/" : "/entries/") +
              d.id +
              (action === "delete" ? "?versao=" + d.versao : "/" + action),
            {
              method: action === "delete" ? "DELETE" : "POST",
              headers: { "content-type": "application/json" },
              ...(action === "delete"
                ? {}
                : {
                    body: JSON.stringify({
                      versao: d.versao,
                      requisicao_id: crypto.randomUUID(),
                    }),
                  }),
            },
          );
          dialog.close();
          productCache = null;
          await loadEntries();
          if (action !== "delete") openInboundDetail(kind, result);
          toast("Operação concluída.");
        })),
  );
  dialog
    .querySelectorAll("[data-detail-entry]")
    .forEach(
      (button) =>
        (button.onclick = async () =>
          openInboundDetail(
            "entry",
            await demoData("/entries/" + button.dataset.detailEntry),
          )),
    );
  if (d.pedido_id)
    document.querySelector("#detail-origin-order").onclick = async () =>
      openInboundDetail("order", await demoData("/purchase-orders/" + d.pedido_id));
  dialog.showModal();
}
function receiveInboundOrder(order) {
  const remaining = order.itens.filter(
    (i) => i.quantidade - i.recebido > 0.000001,
  );
  if (!remaining.length) return toast("Este pedido já foi recebido.");
  openInboundEditor("entry", {
    origem: "PEDIDO",
    pedido_id: order.id,
    numero_pedido: String(order.numero),
    fornecedor_id: order.fornecedor_id,
    data_entrada: dateKey(),
    frete: 0,
    desconto: 0,
    observacao: "Recebimento do pedido #" + order.numero,
    itens: remaining.map((i) => ({
      ...i,
      id: undefined,
      pedido_item_id: i.id,
      quantidade: Number((i.quantidade - i.recebido).toFixed(6)),
      pendente: Number((i.quantidade - i.recebido).toFixed(6)),
      desconto: 0,
    })),
  });
}
function printInbound(){ demoNotice(); }

function openInboundQuickProduct(index) {
  const item = inboundDraft.itens[index],
    dialog = document.querySelector("#inbound-quick-product");
  document.querySelector("#inbound-quick-product-body").innerHTML =
    '<form id="inbound-quick-product-form"><div class="form-grid">' +
    inField(
      "inbound-qp-description",
      "Descrição",
      item.descricao,
      "text",
      "required",
    ) +
    inField(
      "inbound-qp-unit",
      "Unidade",
      item.unidade || "UN",
      "text",
      "required",
    ) +
    inField("inbound-qp-code", "Código interno (vazio: automático)") +
    inField("inbound-qp-ean", "EAN / código de barras", item.ean) +
    inField(
      "inbound-qp-price",
      "Preço de venda (R$)",
      item.novo_produto?.preco || 0,
      "number",
      'min="0" step="0.01" required',
    ) +
    inField("inbound-qp-category", "Categoria", item.novo_produto?.categoria) +
    '<div class="wide">' +
    inField("inbound-qp-ncm", "NCM", item.ncm) +
    '</div></div><p class="note">O produto será cadastrado com estoque zero. O estoque e o custo serão atualizados ao confirmar a entrada.</p><div class="dialog-actions"><button class="btn primary" id="inbound-qp-save" type="submit">Cadastrar e vincular produto</button></div></form>';
  document.querySelector("#inbound-quick-product-form").onsubmit = (event) => {
    event.preventDefault();
    inboundAction(document.querySelector("#inbound-qp-save"), async () => {
      const value = (name) =>
          document.querySelector("#inbound-qp-" + name).value,
        result = await demoData("/products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            descricao: value("description"),
            unidade: value("unit"),
            codigo: value("code"),
            ean: value("ean"),
            ncm: value("ncm"),
            preco: parseAmount(value("price")),
            categoria: value("category"),
            estoque: 0,
            situacao: "Ativo",
          }),
        });
      inbound.products = await demoData("/products");
      const product = inbound.products.find((p) => p.id === result.id);
      Object.assign(item, {
        produto_id: product.id,
        descricao: product.descricao,
        unidade: product.unidade,
        ean: product.ean,
        ncm: product.ncm,
        novo_produto: null,
      });
      productCache = null;
      dialog.close();
      drawInboundItems();
      toast("Produto cadastrado e vinculado.");
    });
  };
  dialog.showModal();
}
document.addEventListener(
  "keydown",
  (event) => {
    if (
      ["F2", "F9"].includes(event.key) &&
      document.querySelector("dialog[id^=inbound-][open]")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
