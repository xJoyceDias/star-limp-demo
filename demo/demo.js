const app = document.querySelector("#app"),
  views = {
    reports: document.querySelector("#reports"),
    dashboard: document.querySelector("#dashboard"),
    entries: document.querySelector("#entries"),
    products: document.querySelector("#products"),
    sales: document.querySelector("#sales"),
    receivables: document.querySelector("#receivables"),
    clients: document.querySelector("#clients"),
    payables: document.querySelector("#payables"),
    sale: document.querySelector("#sale"),
  };
let cart = [],
  selected = null,
  selectedClient = null,
  editing = null,
  currentSale = null,
  timer,
  saleDiscount = 0;
const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const demoData = demoRead;
const clone = (n) => views[n].content.cloneNode(true);
let currentView = "dashboard",
  readController = new AbortController(),
  screenRevision = 0;
const pageMeta = {
  reports: ["Relatórios", "Indicadores fictícios e modelos de relatório"],
  dashboard: ["Início", "Vendas, estoque e contas do seu negócio"],
  entries: ["Entradas", "Notas, pedidos e recebimentos de fornecedores"],
  sales: ["Vendas", "Histórico e detalhes das operações"],
  clients: ["Clientes", "Cadastre clientes e consulte seus dados"],
  receivables: ["Contas de clientes", "Saldos, compras e recebimentos"],
  products: ["Produtos", "Consulte o estoque e atualize produtos e preços"],
  payables: ["Contas a pagar", "Boletos, vencimentos e baixas"],
  sale: ["Nova venda", "Venda de balcão"],
};
function homeGreeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(date));
  const period = hour >= 5 && hour < 12 ? 0 : hour >= 12 && hour < 18 ? 1 : 2;
  const greetings = ["Bom dia", "Boa tarde", "Boa noite"];
  const messages = [
    "Vamos começar o dia com ótimas vendas.",
    "Acompanhe suas vendas e organize seu negócio.",
    "Confira o movimento do dia antes de encerrar.",
  ];
  const name = window.DemoConfig?.operatorName?.trim();
  return { greeting: greetings[period] + (name ? ", " + name : "") + "!", message: messages[period] };
}
function updateHeading(date = new Date()) {
  const home = currentView === "dashboard", greeting = document.querySelector("#home-greeting");
  greeting.hidden = !home;
  if (home) {
    const copy = homeGreeting(date);
    greeting.textContent = copy.greeting;
    document.querySelector("#head-subtitle").textContent = copy.message;
  }
}
const paymentNames = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  fiado: "A prazo",
  transferencia: "Transferência",
};
const paymentColors = {
  pix: "var(--teal)",
  dinheiro: "var(--green)",
  debito: "var(--blue)",
  credito: "var(--violet)",
  fiado: "var(--amber)",
};
const paymentIcons = {
  pix: "pix",
  dinheiro: "money",
  debito: "card",
  credito: "card2",
  fiado: "user",
};
const paymentLabel = (value) => paymentNames[value] || String(value || "");
const parseAmount = (value) => {
  const raw = String(value || "").replace(/[^\d,.-]/g, "");
  return Number(
    raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw,
  );
};
let toastTimer;
function toast(message, error = false) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.className = "toast show " + (error ? "err" : "ok");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 4500);
}
function connection(ok) {
  document.querySelector("#connection-label").textContent = ok
    ? "Simulação local"
    : "Sem conexão";
  document
    .querySelector("#connection-dot")
    .classList.toggle("connection-error", !ok);
}
function bindNavigation(root = document) {
  root
    .querySelectorAll("[data-go]")
    .forEach((button) => (button.onclick = () => render(button.dataset.go)));
  hydrateIcons(root);
}
async function render(name) {
  if (!views[name]) name = "dashboard";
  if (
    currentView === "sale" &&
    name !== "sale" &&
    cart.length &&
    !confirm("Sair do PDV? Os itens permanecem no carrinho até você voltar.")
  )
    return;
  readController.abort();
  readController = new AbortController();
  currentView = name;
  const revision = ++screenRevision;
  app.replaceChildren(clone(name));
  document.body.classList.toggle("sale-mode", name === "sale");
  history.replaceState(null, "", "#/" + name);
  const loadingActions = [
    ...app.querySelectorAll(
      "#new-client,#new-product,#new-payable,#save-receivable",
    ),
  ];
  loadingActions.forEach((button) => (button.disabled = true));
  document
    .querySelectorAll("[data-view]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === name),
    );
  document.querySelector("#head-title").textContent = document.querySelector(
    "#mobile-title",
  ).textContent = pageMeta[name][0];
  document.querySelector("#head-subtitle").textContent = pageMeta[name][1];
  bindNavigation();
  updateClock();
  try {
    await {
      dashboard: loadDashboard,
      entries: loadEntries,
      products: loadProducts,
      sales: loadSales,
      reports: loadSales,
      clients: loadClients,
      receivables: loadReceivables,
      payables: loadPayables,
      sale: setupSale,
    }[name]();
    if (revision === screenRevision) {
      hydrateIcons(app);
      loadingActions.forEach((button) => (button.disabled = false));
    }
  } catch (error) {
    if (error.name === "AbortError" || revision !== screenRevision) return;
    toast(error.message, true);
    app.innerHTML =
      '<div class="load-error"><h3>Não foi possível carregar esta tela</h3><p>' +
      escape(error.message) +
      '</p><button class="btn" id="retry-screen">Tentar novamente</button></div>';
    document.querySelector("#retry-screen").onclick = () => render(name);
  }
}
function updateClock() {
  updateHeading();
  const date = new Date();
  document.querySelectorAll(".js-time").forEach(
    (el) =>
      (el.textContent = date.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      })),
  );
  document.querySelectorAll(".js-date").forEach(
    (el) =>
      (el.textContent = date.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        weekday: "short",
        day: "2-digit",
        month: "short",
      })),
  );
}
function dateKey(date = new Date()) {
  return date.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
function saleDate(value) {
  return new Date(
    String(value).replace(" ", "T") +
      (String(value).includes("Z") || /[+-]\d\d:\d\d$/.test(value)
        ? ""
        : "-03:00"),
  );
}
function amountSum(items, field = "valor_total") {
  return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}
function metric(label, value, caption, color = "blue") {
  return (
    '<article class="stat"><small><i style="background:var(--' +
    color +
    ')"></i>' +
    label +
    "</small><b>" +
    value +
    "</b><span>" +
    caption +
    "</span></article>"
  );
}
function renderBars(target, sales, days = 7) {
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    buckets.push({
      day,
      total: amountSum(
        sales.filter(
          (sale) => String(sale.data_hora).slice(0, 10) === dateKey(day),
        ),
      ),
    });
  }
  const max = Math.max(1, ...buckets.map((x) => x.total));
  target.innerHTML = buckets
    .map(
      (x, i) =>
        '<div class="bcol ' +
        (i === days - 1 ? "today" : "") +
        '" title="' +
        formatDate(dateKey(x.day)) +
        ": " +
        money(x.total) +
        '"><span class="bv">' +
        (x.total ? money(x.total).replace(/R\$\s*/, "") : "—") +
        '</span><div class="bar" style="height:' +
        Math.max(3, (x.total / max) * 100) +
        '%"></div><small>' +
        x.day
          .toLocaleDateString("pt-BR", { weekday: "short" })
          .replace(".", "") +
        "</small></div>",
    )
    .join("");
}
async function loadDashboard() {
  const [dashboard, sales, payables] = await Promise.all([
    demoData("/dashboard"),
    demoData("/sales"),
    demoData("/payables"),
  ]);
  const active = sales.filter((x) => x.status !== "CANCELADA"),
    todayKey = dateKey(),
    monthKey = todayKey.slice(0, 7),
    now = new Date(),
    weekStart = new Date();
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const today = active.filter(
      (x) => String(x.data_hora).slice(0, 10) === todayKey,
    ),
    week = active.filter(
      (x) => String(x.data_hora).slice(0, 10) >= dateKey(weekStart),
    ),
    month = active.filter((x) => String(x.data_hora).slice(0, 7) === monthKey);
  for (const [id, value, list] of [
    ["today", dashboard.vendas_hoje, today],
    ["week", dashboard.vendas_semana, week],
    ["month", dashboard.vendas_mes, month],
  ]) {
    document.querySelector("#" + id).textContent = money(value);
    document.querySelector("#" + id + "-caption").textContent =
      list.length +
      " vendas" +
      (id === "today"
        ? " · ticket médio " +
          money(list.length ? amountSum(list) / list.length : 0)
        : "");
  }
  const open = payables.filter((x) => x.status !== "PAGO"),
    due = open.filter((x) => x.vencimento && x.vencimento < todayKey),
    dueToday = open.filter((x) => x.vencimento === todayKey),
    next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const soon = open.filter(
    (x) => x.vencimento > todayKey && x.vencimento <= dateKey(next7),
  );
  const sum = (list) => amountSum(list, "valor"),
    total = sum(open);
  document.querySelector("#payables-total").textContent = money(total);
  document.querySelector("#payables-caption").textContent =
    open.length + " contas em aberto";
  const groups = [
    ["Vencidas", sum(due), "red"],
    ["Vencem hoje", sum(dueToday), "amber"],
    ["Próximos 7 dias", sum(soon), "blue"],
  ];
  document.querySelector("#payables-stack").innerHTML = groups
    .map(
      ([label, value, color]) =>
        '<b style="width:' +
        (value / Math.max(1, total)) * 100 +
        "%;background:var(--" +
        color +
        ')"></b>',
    )
    .join("");
  document.querySelector("#payables-legend").innerHTML = groups
    .map(
      ([label, value, color]) =>
        '<div class="lg"><i style="background:var(--' +
        color +
        ')"></i>' +
        label +
        "<b>" +
        money(value) +
        "</b></div>",
    )
    .join("");
  const alerts = document.querySelector("#dashboard-alerts");
  alerts.innerHTML =
    '<div class="alert ' +
    (dueToday.length ? "hoje" : "ok") +
    '"><div class="ai">' +
    ic(dueToday.length ? "alert" : "check", 22) +
    '</div><div class="at"><b>' +
    (dueToday.length
      ? "Vence hoje: " + dueToday.length + " boletos · " + money(sum(dueToday))
      : "Nenhum boleto vence hoje") +
    "</b><small>" +
    escape(
      dueToday
        .map((x) => x.fornecedor)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ") || "Acompanhe os próximos vencimentos",
    ) +
    '</small></div><button class="btn sm" data-go="payables">Ver e baixar</button></div>' +
    (due.length
      ? '<div class="alert venc"><div class="ai">' +
        ic("alert", 22) +
        '</div><div class="at"><b>' +
        due.length +
        " contas vencidas · " +
        money(sum(due)) +
        '</b><small>Consulte as contas e registre a baixa</small></div><button class="btn sm" data-go="payables">Regularizar</button></div>'
      : "");
  const badge = document.querySelector("#payables-badge");
  badge.textContent = due.length + dueToday.length;
  badge.classList.toggle("show", Boolean(due.length + dueToday.length));
  renderBars(document.querySelector("#sales-bars"), active);
  const mix = {};
  month.forEach(
    (x) =>
      (mix[x.forma_pagamento] =
        (mix[x.forma_pagamento] || 0) + Number(x.valor_total)),
  );
  const monthTotal = Math.max(1, amountSum(month));
  document.querySelector("#payments-stack").innerHTML = Object.entries(mix)
    .map(
      ([key, value]) =>
        '<b style="width:' +
        (value / monthTotal) * 100 +
        "%;background:" +
        paymentColors[key] +
        '"></b>',
    )
    .join("");
  document.querySelector("#payments-legend").innerHTML =
    Object.entries(mix)
      .map(
        ([key, value]) =>
          '<div class="lg"><i style="background:' +
          paymentColors[key] +
          '"></i>' +
          escape(paymentLabel(key)) +
          "<em>" +
          Math.round((value / monthTotal) * 100) +
          "%</em><b>" +
          money(value) +
          "</b></div>",
      )
      .join("") || '<p class="note">Sem vendas no mês.</p>';
  document.querySelector("#recent-sales").innerHTML =
    sales
      .slice(0, 6)
      .map(
        (x) =>
          '<button class="mi" data-sale-id="' +
          x.id +
          '"><div class="mi-i" style="background:color-mix(in srgb,' +
          (paymentColors[x.forma_pagamento] || "var(--blue)") +
          " 15%,transparent);color:" +
          (paymentColors[x.forma_pagamento] || "var(--blue)") +
          '">' +
          ic(paymentIcons[x.forma_pagamento] || "receipt", 19) +
          '</div><div class="mi-m"><div class="mi-t">#' +
          x.id +
          " · " +
          escape(x.cliente_nome || "Consumidor final") +
          '</div><div class="mi-s">' +
          formatDocumentDate(x.data_hora) +
          " · " +
          escape(paymentLabel(x.forma_pagamento)) +
          '</div></div><div class="mi-v">' +
          money(x.valor_total) +
          '<small class="' +
          (x.status === "CANCELADA" ? "neg" : "pos") +
          '">' +
          (x.status === "CANCELADA" ? "Cancelada" : "Concluída") +
          "</small></div></button>",
      )
      .join("") || '<p class="note">Nenhuma venda registrada.</p>';
  document
    .querySelectorAll("[data-sale-id]")
    .forEach(
      (button) =>
        (button.onclick = () => openSaleDetails(button.dataset.saleId)),
    );
  document.querySelector("#upcoming-payables").innerHTML =
    open
      .sort((a, b) =>
        String(a.vencimento || "9999").localeCompare(
          String(b.vencimento || "9999"),
        ),
      )
      .slice(0, 4)
      .map(
        (x) =>
          '<button class="mi" data-go="payables"><div class="mi-i" style="background:#2e9bff20;color:var(--blue)">' +
          ic("calendar", 19) +
          '</div><div class="mi-m"><div class="mi-t">' +
          escape(x.fornecedor || "Fornecedor não informado") +
          '</div><div class="mi-s">' +
          escape(x.descricao || "") +
          (x.entrada_id
            ? "<small>Entrada #" +
              x.entrada_numero +
              (x.entrada_documento
                ? " · NF-e " + escape(x.entrada_documento)
                : "") +
              (x.pedido_numero ? " · Pedido #" + x.pedido_numero : "") +
              "</small>"
            : "") +
          '</div></div><div class="mi-v">' +
          money(x.valor) +
          '<small class="' +
          (x.vencimento < todayKey
            ? "neg"
            : x.vencimento === todayKey
              ? "warn"
              : "") +
          '">' +
          (x.vencimento === todayKey
            ? "Vence hoje"
            : formatDate(x.vencimento)) +
          "</small></div></button>",
      )
      .join("") || '<p class="note">Nenhuma conta em aberto.</p>';
  bindNavigation(app);
  document.querySelectorAll("[data-shortcut]").forEach(
    (button) =>
      (button.onclick = async () => {
        const target = button.dataset.shortcut;
        await render(target);
        if (currentView !== target) return;
        if (target === "clients") openClientDialog(() => loadClients());
        if (target === "products") openProduct();
        if (target === "payables") openPayable();
      }),
  );
}
function openCommand() {
  const dialog = document.querySelector("#command-dialog"),
    input = document.querySelector("#command-search"),
    list = document.querySelector("#command-list");
  input.value = "";
  const draw = () => {
    list.innerHTML =
      Object.entries(pageMeta)
        .filter(([id, meta]) =>
          normalizarBusca(meta.join(" ")).includes(
            normalizarBusca(input.value),
          ),
        )
        .map(
          ([id, meta]) =>
            '<button type="button" class="command-item" data-command="' +
            id +
            '">' +
            ic(id === "sale" ? "plus" : "arrow", 18) +
            "<span>" +
            meta[0] +
            "</span></button>",
        )
        .join("") || '<p class="note">Nenhuma ação encontrada.</p>';
    list.querySelectorAll("button").forEach(
      (button) =>
        (button.onclick = () => {
          dialog.close();
          render(button.dataset.command);
        }),
    );
  };
  input.oninput = draw;
  draw();
  dialog.showModal();
  input.focus();
}

async function loadPayables() {
  const [all, summary] = await Promise.all([
      demoData("/payables"),
      demoData("/payables/summary"),
    ]),
    today = dateKey(),
    open = all.filter((x) => x.status !== "PAGO"),
    due = open.filter((x) => x.vencimento && x.vencimento < today),
    dueToday = open.filter((x) => x.vencimento === today);
  let filter = "",
    display = "list",
    month = new Date();
  month.setDate(1);
  for (const [id, value, caption] of [
    ["payable-pending", summary.pendente?.valor, open.length + " contas"],
    ["payable-overdue", amountSum(due, "valor"), due.length + " contas"],
    [
      "payable-today",
      amountSum(dueToday, "valor"),
      dueToday.length + " boletos",
    ],
    [
      "payable-paid-month",
      summary.pago_mes?.valor,
      (summary.pago_mes?.quantidade || 0) + " baixas",
    ],
  ]) {
    document.querySelector("#" + id).textContent = money(value);
    document.querySelector("#" + id + "-caption").textContent = caption;
  }
  const search = document.querySelector("#payable-search"),
    matches = (x) =>
      correspondeBusca(x, search.value, [
        "fornecedor",
        "descricao",
        "linha_digitavel",
      ]);
  const bind = () => {
    document.querySelectorAll("[data-payable-entry]").forEach(
      (button) =>
        (button.onclick = async () => {
          const id = button.dataset.payableEntry;
          await render("entries");
          openInboundDetail("entry", await demoData("/entries/" + id));
        }),
    );
    document
      .querySelectorAll("[data-settle]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            openSettlement(
              all.find((x) => String(x.id) === button.dataset.settle),
            )),
      );
    document.querySelectorAll("[data-delete-payable]").forEach(
      (button) =>
        (button.onclick = async () => {
          if (!confirm("Excluir esta conta cadastrada?")) return;
          try {
            await demoData("/payables/" + button.dataset.deletePayable, {
              method: "DELETE",
            });
            loadPayables();
          } catch (error) {
            toast(error.message, true);
          }
        }),
    );
  };
  const draw = () => {
    document.querySelector("#payable-chips").innerHTML = [
      ["", "Todas", all.length],
      ["today", "Vencem hoje", dueToday.length],
      ["next", "A vencer", open.length - due.length - dueToday.length],
      ["due", "Vencidas", due.length],
      ["paid", "Pagas", all.length - open.length],
    ]
      .map(
        ([id, label, count]) =>
          '<button class="chip ' +
          (filter === id ? "on" : "") +
          '" data-payable-filter="' +
          id +
          '">' +
          label +
          " <small>" +
          count +
          "</small></button>",
      )
      .join("");
    document.querySelectorAll("[data-payable-filter]").forEach(
      (button) =>
        (button.onclick = () => {
          filter = button.dataset.payableFilter;
          draw();
        }),
    );
    const filtered = all.filter(
      (x) =>
        matches(x) &&
        (!filter ||
          (filter === "paid"
            ? x.status === "PAGO"
            : x.status !== "PAGO" &&
              (filter === "today"
                ? x.vencimento === today
                : filter === "due"
                  ? x.vencimento && x.vencimento < today
                  : x.vencimento > today))),
    );
    document.querySelector("#payable-table").hidden = display !== "list";
    document.querySelector("#payable-calendar").hidden = display !== "calendar";
    document
      .querySelectorAll("[data-payable-view]")
      .forEach((button) =>
        button.classList.toggle("on", display === button.dataset.payableView),
      );
    document.querySelector("#payable-rows").innerHTML = filtered
      .sort((a, b) =>
        String(a.vencimento || "9999").localeCompare(
          String(b.vencimento || "9999"),
        ),
      )
      .map((x) => {
        const paid = x.status === "PAGO",
          overdue = x.vencimento && x.vencimento < today;
        return (
          "<tr><td><b>" +
          formatDate(x.vencimento) +
          '</b><small class="' +
          (overdue && !paid ? "neg" : "") +
          '">' +
          (paid
            ? "Pago"
            : x.vencimento === today
              ? "Vence hoje"
              : overdue
                ? "Vencida"
                : "A vencer") +
          "</small></td><td><b>" +
          escape(x.fornecedor || "Fornecedor não identificado") +
          "</b><small>" +
          escape(x.descricao || "") +
          "</small>" +
          (x.entrada_id
            ? "<small>Entrada #" +
              x.entrada_numero +
              (x.entrada_documento
                ? " · NF-e " + escape(x.entrada_documento)
                : "") +
              (x.pedido_numero ? " · Pedido #" + x.pedido_numero : "") +
              '</small><button class="btn sm" data-payable-entry="' +
              x.entrada_id +
              '">Abrir entrada</button>'
            : "") +
          '</td><td class="money">' +
          money(x.valor) +
          '</td><td><span class="pill ' +
          (paid ? "p-green" : overdue ? "p-red" : "p-amber") +
          '">' +
          (paid ? "Paga" : overdue ? "Vencida" : "Em aberto") +
          "</span></td><td>" +
          (paid
            ? "Pago: " + money(x.total_baixado)
            : '<button class="btn sm" data-settle="' +
              x.id +
              '">Baixar</button><button class="btn sm danger" data-delete-payable="' +
              x.id +
              '">Excluir</button>') +
          "</td></tr>"
        );
      })
      .join("");
    document.querySelector("#empty-payables").textContent = filtered.length
      ? ""
      : "Nenhuma conta encontrada.";
    if (display === "calendar") {
      const year = month.getFullYear(),
        m = month.getMonth(),
        count = new Date(year, m + 1, 0).getDate(),
        offset = (new Date(year, m, 1).getDay() + 6) % 7;
      document.querySelector("#payable-calendar").innerHTML =
        '<header class="calendar-head"><button class="btn sm" id="calendar-prev">←</button><h3>' +
        month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) +
        '</h3><button class="btn sm" id="calendar-next">→</button></header><div class="calendar-grid">' +
        ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
          .map((x) => "<small>" + x + "</small>")
          .join("") +
        "<div></div>".repeat(offset) +
        Array.from({ length: count }, (_, i) => {
          const key =
            year +
            "-" +
            String(m + 1).padStart(2, "0") +
            "-" +
            String(i + 1).padStart(2, "0");
          return (
            '<div class="calendar-day"><b>' +
            String(i + 1) +
            "</b>" +
            filtered
              .filter((x) => x.vencimento === key)
              .map(
                (x) =>
                  "<button " +
                  (x.status === "PAGO"
                    ? "disabled"
                    : 'data-settle="' + x.id + '"') +
                  ' title="' +
                  escape(x.fornecedor) +
                  '">' +
                  money(x.valor) +
                  " · " +
                  escape(x.fornecedor || "Conta") +
                  "</button>",
              )
              .join("") +
            "</div>"
          );
        }).join("") +
        "</div>";
      document.querySelector("#calendar-prev").onclick = () => {
        month.setMonth(month.getMonth() - 1);
        draw();
      };
      document.querySelector("#calendar-next").onclick = () => {
        month.setMonth(month.getMonth() + 1);
        draw();
      };
    }
    bind();
  };
  search.oninput = draw;
  document.querySelectorAll("[data-payable-view]").forEach(
    (button) =>
      (button.onclick = () => {
        display = button.dataset.payableView;
        draw();
      }),
  );
  document.querySelector("#new-payable").onclick = openPayable;
  draw();
}

function formatDate(value) {
  if (!value) return "—";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + "/" + m[2] + "/" + m[1] : value;
}
function openPayable() {
  const dialog = document.querySelector("#payable-dialog"),
    file = document.querySelector("#boleto-file"),
    status = document.querySelector("#pdf-status"),
    preview = document.querySelector("#installments-preview");
  let boletos = [],
    parcelas = [];
  const current = () => ({
    fornecedor: document.querySelector("#p-supplier").value.trim(),
    descricao:
      document.querySelector("#p-description").value.trim() ||
      "Boleto importado",
    linha_digitavel: document.querySelector("#p-line").value.replace(/\D/g, ""),
    valor: Number(document.querySelector("#p-value").value),
    vencimento: document.querySelector("#p-due").value,
  });
  const renderParcelas = () => {
    preview.innerHTML = parcelas.length
      ? "<b>" +
        parcelas.length +
        " parcela(s) preparada(s)</b>" +
        parcelas
          .map(
            (parcela, index) =>
              "<div>Parcela " +
              (index + 1) +
              ": " +
              money(parcela.valor) +
              " · " +
              escape(formatDate(parcela.vencimento)) +
              ' <button type="button" data-remove="' +
              index +
              '">×</button></div>',
          )
          .join("")
      : "";
    preview.querySelectorAll("[data-remove]").forEach(
      (button) =>
        (button.onclick = () => {
          parcelas.splice(Number(button.dataset.remove), 1);
          renderParcelas();
        }),
    );
  };
  const validar = (parcela) => {
    if (!parcela.valor || parcela.valor <= 0)
      throw new Error("Informe o valor da parcela.");
    if (!parcela.vencimento)
      throw new Error("Informe o vencimento da parcela.");
    return parcela;
  };
  dialog.querySelector("form").reset();
  document.querySelector("#p-description").value = "Boleto importado";
  document.querySelector("#boleto-file-name").textContent =
    "Selecionar boleto em PDF";
  status.textContent = "";
  renderParcelas();
  file.onchange = () => demoNotice();
  document.querySelector("#add-installment").onclick = () => {
    try {
      if (boletos.length) {
        parcelas.push(...boletos.slice(1));
        boletos = [];
      }
      parcelas.push(validar(current()));
      renderParcelas();
      document.querySelector("#p-line").value = "";
      document.querySelector("#p-value").value = "";
      document.querySelector("#p-due").value = "";
      status.textContent =
        "Parcela adicionada. Você pode incluir outra ou cadastrar as preparadas.";
    } catch (error) {
      status.textContent = error.message;
    }
  };
  dialog.showModal();
  dialog.querySelector("form").onsubmit = () => demoNotice();
}
async function pdfToPages(file) {
  const pdfjs = await import("/vendor/pdf.min.mjs");
  pdfjs.GlobalDemonstraçãoOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() })
      .promise,
    pages = [];
  for (let page = 1; page <= doc.numPages; page++) {
    const content = await (await doc.getPage(page)).getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages;
}
function extractBoleto(text) {
  const lines =
    text.match(
      /\b\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14}\b/g,
    ) || [];
  const linha_digitavel = (
    lines[0] ||
    (text.match(/\d[\d .-]{43,}/g) || []).find(
      (value) => value.replace(/\D/g, "").length >= 44,
    ) ||
    ""
  ).replace(/\D/g, "");
  const values = [
    ...text.matchAll(/R\$\s*([\d.]+,\d{2}|\d+,\d{2}|\d+\.\d{2})/gi),
  ]
    .map((match) => parseAmount(match[1]))
    .filter((value) => value > 0);
  const date = text.match(
    /(?:vencimento|venc\.?)[^\d]*(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/i,
  );
  const supplier =
    text.match(
      /Benefici[aá]rio\s+Ag[êe]ncia\/C[oó]digo\s+Benefici[aá]rio\s+(.+?)(?:\s+CNPJ|\s+\d{4}\/)/i,
    ) ||
    text.match(
      /(?:benefici[aá]rio|cedente|fornecedor)\s*[:\-]?\s*([^\n]{3,100})/i,
    );
  const fornecedor = (supplier?.[1] || "")
    .split(/\s+(?:CNPJ|CPF|vencimento|ag[êe]ncia|nosso n[úu]mero|R\$)/i)[0]
    .trim();
  return {
    linha_digitavel,
    valor: values[0] || 0,
    vencimento: date ? date[3] + "-" + date[2] + "-" + date[1] : "",
    fornecedor,
  };
}
function fillBoleto(boleto) {
  document.querySelector("#p-line").value = boleto.linha_digitavel || "";
  document.querySelector("#p-value").value = boleto.valor
    ? Number(boleto.valor).toFixed(2)
    : "";
  document.querySelector("#p-due").value = boleto.vencimento || "";
  document.querySelector("#p-supplier").value = boleto.fornecedor || "";
}
function openSettlement(conta) {
  const dialog = document.querySelector("#settlement-dialog");
  document.querySelector("#settlement-title").textContent =
    (conta.fornecedor || "Conta") + " — " + money(conta.valor);
  document.querySelector("#s-value").value = Number(conta.valor).toFixed(2);
  document.querySelector("#s-date").value = new Date()
    .toISOString()
    .slice(0, 10);
  document.querySelector("#s-bank").value = "";
  document.querySelector("#s-note").value = "";
  dialog.showModal();
  dialog.querySelector("form").onsubmit = async (event) => {
    if (event.submitter?.id !== "save-settlement") return;
    event.preventDefault();
    await demoData("/payables/" + conta.id + "/settlements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        banco: document.querySelector("#s-bank").value,
        valor_pago: document.querySelector("#s-value").value,
        data_pagamento: document.querySelector("#s-date").value,
        observacao: document.querySelector("#s-note").value,
      }),
    });
    dialog.close();
    loadPayables();
  };
}

const normalizarBusca = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const correspondeBusca = (item, termo, campos) => {
  const parts = normalizarBusca(termo).split(" ").filter(Boolean);
  const text = campos.map((campo) => normalizarBusca(item[campo])).join(" ");
  return parts.every((part) => text.includes(part));
};
let productCache = null;
const todosProdutos = () =>
  productCache ||
  (productCache = demoData("/products").catch((error) => {
    productCache = null;
    throw error;
  }));
async function openHistoricalCredit() {
  const dialog = document.querySelector("#historical-credit-dialog"), form = dialog.querySelector("form");
  try {
    const clients = await demoData("/clients");
    form.reset();
    document.querySelector("#historical-client").innerHTML = '<option value="">Selecione um cliente</option>' + clients.map(client => '<option value="' + client.id + '">' + escape(client.nome) + '</option>').join("");
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    document.querySelector("#historical-date").max = dateKey(yesterday);
    document.querySelector("#close-historical-credit").onclick = () => dialog.close();
    form.onsubmit = async event => {
      event.preventDefault();
      const button = document.querySelector("#save-historical-credit");
      button.disabled = true;
      try {
        await demoData("/sales", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({
          registro_anterior: "resumo", forma_pagamento: "fiado",
          cliente_id: Number(document.querySelector("#historical-client").value),
          data_compra: document.querySelector("#historical-date").value,
          valor_devido: Number(document.querySelector("#historical-value").value),
          observacao: document.querySelector("#historical-note").value,
        }) });
        dialog.close();
        toast("Compra antiga registrada na data informada.");
        await loadReceivables();
      } catch (error) { alert(error.message || "Não foi possível registrar a compra antiga."); }
      finally { button.disabled = false; }
    };
    dialog.showModal();
  } catch (error) { alert(error.message || "Não foi possível carregar os clientes."); }
}
async function loadReceivables() {
  document.querySelector("#new-historical-credit").onclick = openHistoricalCredit;
  document.querySelector("#historical-with-products").onclick = async () => {
    await render("sale");
    const field = document.querySelector("#historical-sale");
    field.checked = true;
    field.dispatchEvent(new Event("change"));
    document.querySelector("#historical-sale-date").focus();
  };
  const previousClient = document.querySelector("#receive-client").value;
  const clients = await demoData("/receivables"),
    select = document.querySelector("#receive-client"),
    rows = document.querySelector("#receivable-rows");
  document.querySelector("#receivable-stats").innerHTML =
    metric(
      "Total a receber",
      money(amountSum(clients, "saldo_fiado")),
      "saldo devedor",
      "red",
    ) +
    metric("Clientes com saldo", clients.length, "contas em aberto", "amber");
  select.innerHTML =
    '<option value="">Selecione um cliente</option>' +
    clients
      .map(
        (client) =>
          '<option value="' +
          client.id +
          '">' +
          escape(client.nome) +
          " — " +
          money(client.saldo_fiado) +
          "</option>",
      )
      .join("");
  const showDetail = async (id) => {
    if (!id) {
      document.querySelector("#customer-account").hidden = true;
      return;
    }
    const data = await demoData("/receivables/" + id),
      box = document.querySelector("#customer-account");
    document.querySelector("#account-payments").innerHTML =
      data.pagamentos
        .map(
          (p) =>
            '<div class="mi"><div class="mi-m"><b>' +
            escape(paymentLabel(p.forma_pagamento)) +
            "</b><small>" +
            formatDocumentDate(p.data_hora) +
            " · " +
            escape(p.observacao || "") +
            "</small></div><strong>" +
            money(p.valor_pago) +
            "</strong></div>",
        )
        .join("") || '<p class="note">Nenhum recebimento registrado.</p>';
    box.hidden = false;
    document.querySelector("#account-title").textContent =
      data.cliente.nome + " — saldo: " + money(data.cliente.saldo_fiado);
    document.querySelector("#account-info").textContent =
      [data.cliente.telefone, data.cliente.cpf_cnpj]
        .filter(Boolean)
        .join(" · ") || "Dados de contato não informados";
    document.querySelector("#account-purchases").innerHTML = data.compras.length
      ? data.compras
          .map(
            (compra) =>
              "<tr><td>" +
              formatDocumentDate(compra.data_hora) +
              "</td><td><b>" +
              escape(compra.itens || "Venda #" + compra.venda_id) +
              "</b><br><small>Retirado por: " +
              escape(compra.retirado_por || data.cliente.nome) +
              "</small></td><td>" +
              money(compra.valor_compra) +
              "</td><td>" +
              money(compra.saldo_aberto) +
              "</td></tr>",
          )
          .join("")
      : '<tr><td colspan="4">Nenhuma compra em aberto.</td></tr>';
  };
  const choose = (client) => {
    select.value = client.id;
    document.querySelector("#receive-value").value = Number(
      client.saldo_fiado,
    ).toFixed(2);
    showDetail(client.id);
    document
      .querySelector("#customer-account")
      .scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  rows.innerHTML = clients
    .map(
      (client) =>
        "<tr><td><b>" +
        escape(client.nome) +
        "</b></td><td>" +
        escape(client.telefone || "—") +
        "</td><td>" +
        money(client.saldo_fiado) +
        '</td><td><button class="btn sm account-detail" data-id="' +
        client.id +
        '">Ver conta</button><button class="btn sm receive-client" data-id="' +
        client.id +
        '">Receber</button></td></tr>',
    )
    .join("");
  document.querySelector("#empty-receivables").textContent = clients.length
    ? ""
    : "Nenhum cliente com saldo em aberto.";
  document.querySelector("#receivable-search").oninput = (event) =>
    rows
      .querySelectorAll("tr")
      .forEach(
        (row, index) =>
          (row.hidden = !correspondeBusca(clients[index], event.target.value, [
            "nome",
            "telefone",
            "cpf_cnpj",
          ])),
      );
  select.onchange = () => {
    const client = clients.find((x) => String(x.id) === select.value);
    document.querySelector("#receive-value").value = client
      ? Number(client.saldo_fiado).toFixed(2)
      : "";
    showDetail(select.value).catch((error) => toast(error.message, true));
  };
  rows
    .querySelectorAll(".account-detail")
    .forEach(
      (button) =>
        (button.onclick = () =>
          choose(
            clients.find((client) => String(client.id) === button.dataset.id),
          )),
    );
  rows
    .querySelectorAll(".receive-client")
    .forEach(
      (button) =>
        (button.onclick = () =>
          choose(
            clients.find((client) => String(client.id) === button.dataset.id),
          )),
    );
  document.querySelector("#save-receivable").onclick = async () => {
    const client = clients.find((item) => String(item.id) === select.value),
      value = Number(document.querySelector("#receive-value").value);
    if (!client || value <= 0)
      return alert("Selecione o cliente e informe o valor recebido.");
    const button = document.querySelector("#save-receivable");
    button.disabled = true;
    try {
      const payment = await demoData("/receivables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cliente_id: client.id,
          valor_pago: value,
          forma_pagamento: document.querySelector("#receive-method").value,
          observacao: document.querySelector("#receive-note").value,
        }),
      });
      if (confirm("Pagamento registrado. Deseja imprimir o comprovante?"))
        printPaymentReceipt(payment);
      await loadReceivables();
    } finally {
      button.disabled = false;
    }
  };
  if (previousClient) {
    select.value = clients.some((x) => String(x.id) === previousClient)
      ? previousClient
      : "";
    document.querySelector("#receive-value").value =
      clients.find((x) => String(x.id) === previousClient)?.saldo_fiado || "";
    await showDetail(previousClient);
  }
}
async function loadSales() {
  const all = await demoData("/sales"),
    search = document.querySelector("#sales-search"),
    period = document.querySelector("#sales-period"),
    status = document.querySelector("#sales-status");
  let method = "",
    filtered = [];
  const draw = () => {
    const start = new Date();
    start.setDate(start.getDate() - Number(period.value) + 1);
    filtered = all.filter(
      (sale) =>
        (period.value === "0" ||
          String(sale.data_hora).slice(0, 10) >= dateKey(start)) &&
        (!status.value || sale.status === status.value) &&
        (!method || sale.forma_pagamento === method) &&
        correspondeBusca(sale, search.value, [
          "id",
          "cliente_nome",
          "forma_pagamento",
          "status",
        ]),
    );
    const active = filtered.filter((x) => x.status !== "CANCELADA"),
      total = amountSum(active);
    document.querySelector("#sales-stats").innerHTML =
      metric(
        "Total vendido",
        money(total),
        active.length + " vendas concluídas",
      ) +
      metric(
        "Ticket médio",
        money(active.length ? total / active.length : 0),
        "por venda",
        "teal",
      ) +
      metric(
        "Itens vendidos",
        active.reduce((sum, x) => sum + Number(x.quantidade_itens || 0), 0),
        "unidades",
        "amber",
      ) +
      metric(
        "Canceladas",
        filtered.length - active.length,
        "no período",
        "red",
      );
    document.querySelector("#sales-chart-caption").textContent =
      "Total " + money(total);
    renderBars(
      document.querySelector("#sales-chart"),
      active,
      period.value === "1" ? 1 : period.value === "7" ? 7 : 30,
    );
    document.querySelector("#sales-chips").innerHTML = [
      ["", "Todas"],
      ...Object.entries(paymentNames).filter(
        ([key]) => key !== "transferencia",
      ),
    ]
      .map(
        ([key, label]) =>
          '<button class="chip ' +
          (method === key ? "on" : "") +
          '" data-method="' +
          key +
          '">' +
          label +
          "<small>" +
          all.filter((x) => !key || x.forma_pagamento === key).length +
          "</small></button>",
      )
      .join("");
    document.querySelectorAll("[data-method]").forEach(
      (button) =>
        (button.onclick = () => {
          method = button.dataset.method;
          draw();
        }),
    );
    const rows = document.querySelector("#sales-rows");
    rows.innerHTML = filtered
      .map(
        (sale) =>
          '<tr class="sale-row" data-id="' +
          sale.id +
          '"><td><b>#' +
          sale.id +
          "</b><small>Ver detalhes</small></td><td>" +
          formatDocumentDate(sale.data_hora) +
          "</td><td>" +
          escape(sale.cliente_nome || "Consumidor final") +
          '</td><td><span class="fdot"><i style="background:' +
          paymentColors[sale.forma_pagamento] +
          '"></i>' +
          escape(paymentLabel(sale.forma_pagamento)) +
          '</span></td><td class="money">' +
          money(sale.valor_total) +
          '</td><td><span class="pill ' +
          (sale.status === "CANCELADA" ? "p-red" : "p-green") +
          '">' +
          (sale.status === "CANCELADA" ? "Cancelada" : "Concluída") +
          '</span></td><td><button class="btn sm" data-detail="' +
          sale.id +
          '">Detalhes</button></td></tr>',
      )
      .join("");
    document.querySelector("#empty-sales").textContent = filtered.length
      ? ""
      : "Nenhuma venda encontrada. Ajuste o período ou os filtros.";
    rows.querySelectorAll("tr").forEach((row) => {
      row.onclick = () => openSaleDetails(row.dataset.id);
      row.tabIndex = 0;
      row.onkeydown = (event) => {
        if (event.key === "Enter") openSaleDetails(row.dataset.id);
      };
    });
  };
  search.oninput = period.onchange = status.onchange = draw;
  draw();
  document.querySelector("#export-sales").onclick = () => demoNotice();
  document.querySelector("#print-sales-report").onclick = () =>
    printSalesReport(filtered);
}

async function openSaleDetails(id) {
  const data = await demoData("/sales/" + id),
    sale = data.venda,
    client = data.cliente,
    credit = data.fiado,
    dialog = document.querySelector("#sale-details-dialog");
  const clientInfo = client
    ? '<section class="detail-customer"><span>CLIENTE</span><b>' +
      escape(client.nome) +
      "</b><small>" +
      escape(client.telefone || "Telefone não informado") +
      (client.cpf_cnpj ? " · " + escape(client.cpf_cnpj) : "") +
      "</small>" +
      (credit
        ? "<small>Retirado por: " +
          escape(credit.retirado_por || client.nome) +
          "</small>"
        : "") +
      "</section>"
    : '<section class="detail-customer"><span>CLIENTE</span><b>Consumidor final</b></section>';
  document.querySelector("#sale-details-title").textContent =
    "Venda #" + sale.id;
  document.querySelector("#sale-details-content").innerHTML =
    '<div class="detail-meta"><span>' +
    formatDocumentDate(sale.data_hora) +
    '</span><span class="status ' +
    (sale.status === "CANCELADA" ? "pending" : "paid") +
    '">' +
    escape(sale.status) +
    "</span></div>" +
    clientInfo +
    '<table class="detail-items"><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>' +
    data.itens
      .map(
        (item) =>
          "<tr><td>" +
          escape(item.descricao) +
          "</td><td>" +
          item.quantidade +
          "</td><td>" +
          money(item.preco_unitario) +
          "</td><td>" +
          money(item.subtotal) +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table><div class="detail-total"><span>FORMA DE PAGAMENTO<br><b>' +
    escape(paymentLabel(sale.forma_pagamento)).toUpperCase() +
    "</b></span><strong>" +
    money(sale.valor_total) +
    "</strong></div>";
  const edit = document.querySelector("#detail-edit-sale"),
    cancel = document.querySelector("#detail-cancel-sale");
  edit.hidden = sale.status === "CANCELADA";
  cancel.hidden = sale.status === "CANCELADA";
  edit.onclick = () => {
    dialog.close();
    openSaleEdit(sale);
  };
  cancel.onclick = async () => {
    if (
      !confirm(
        "Cancelar a venda #" + sale.id + "? O histórico será preservado.",
      )
    )
      return;
    await demoData("/sales/" + sale.id + "/cancel", { method: "POST" });
    dialog.close();
    loadSales();
  };
  document.querySelector("#detail-print-order").onclick = () =>
    print(sale.id, false);
  document.querySelector("#detail-print-receipt").onclick = () =>
    print(sale.id, true);
  dialog.showModal();
}
function openSaleEdit(sale) {
  const dialog = document.querySelector("#sale-edit-dialog");
  document.querySelector("#sale-edit-title").textContent =
    "Venda #" + sale.id + " — " + money(sale.valor_total);
  document.querySelector("#sale-edit-payment").value = sale.forma_pagamento;
  dialog.showModal();
  dialog.querySelector("form").onsubmit = async (event) => {
    if (event.submitter?.id !== "save-sale-edit") return;
    event.preventDefault();
    await demoData("/sales/" + sale.id, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        forma_pagamento: document.querySelector("#sale-edit-payment").value,
      }),
    });
    dialog.close();
    loadSales();
  };
}
async function loadClients() {
  const all = await demoData("/clients"),
    search = document.querySelector("#client-search"),
    sort = document.querySelector("#client-sort");
  let filter = "all";
  const debtors = all.filter((x) => Number(x.saldo_fiado) > 0),
    total = amountSum(all, "saldo_fiado"),
    largest = debtors.slice().sort((a, b) => b.saldo_fiado - a.saldo_fiado)[0];
  document.querySelector("#clients-stats").innerHTML =
    metric("Total a receber", money(total), "em contas de clientes", "red") +
    metric(
      "Clientes com saldo",
      debtors.length,
      "de " + all.length + " cadastrados",
      "amber",
    ) +
    metric(
      "Maior saldo",
      largest ? money(largest.saldo_fiado) : "—",
      escape(largest?.nome || "ninguém em aberto"),
      "violet",
    ) +
    metric("Em dia", all.length - debtors.length, "sem pendências", "green");
  const draw = () => {
    const clients = all
        .filter(
          (client) =>
            correspondeBusca(client, search.value, [
              "nome",
              "telefone",
              "cpf_cnpj",
            ]) &&
            (filter === "all" ||
              (filter === "debt"
                ? client.saldo_fiado > 0
                : Number(client.saldo_fiado) === 0)),
        )
        .sort((a, b) =>
          sort.value === "nome"
            ? a.nome.localeCompare(b.nome, "pt-BR")
            : b.saldo_fiado - a.saldo_fiado ||
              a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      rows = document.querySelector("#client-rows");
    document.querySelector("#client-chips").innerHTML = [
      ["all", "Todos", all.length],
      ["debt", "Com saldo", debtors.length],
      ["paid", "Em dia", all.length - debtors.length],
    ]
      .map(
        ([id, label, count]) =>
          '<button class="chip ' +
          (id === filter ? "on" : "") +
          '" data-client-filter="' +
          id +
          '">' +
          label +
          "<small>" +
          count +
          "</small></button>",
      )
      .join("");
    document.querySelectorAll("[data-client-filter]").forEach(
      (button) =>
        (button.onclick = () => {
          filter = button.dataset.clientFilter;
          draw();
        }),
    );
    rows.innerHTML = clients
      .map(
        (client) =>
          '<tr><td><div class="c-main"><span class="cav">' +
          escape(client.nome.charAt(0).toUpperCase()) +
          "</span><div><b>" +
          escape(client.nome) +
          "</b><small>" +
          escape(client.cpf_cnpj || "Sem documento") +
          "</small></div></div></td><td>" +
          escape(client.telefone || "—") +
          '</td><td class="money ' +
          (client.saldo_fiado > 0 ? "neg" : "pos") +
          '">' +
          (client.saldo_fiado > 0 ? money(client.saldo_fiado) : "Em dia") +
          '</td><td><button class="btn sm client-edit" data-id="' +
          client.id +
          '">Editar</button><button class="btn sm danger client-delete" data-id="' +
          client.id +
          '">Excluir</button>' +
          (client.saldo_fiado > 0
            ? '<button class="btn sm" data-receive="' +
              client.id +
              '">Receber</button>'
            : "") +
          "</td></tr>",
      )
      .join("");
    document.querySelector("#empty-clients").textContent = clients.length
      ? ""
      : "Nenhum cliente encontrado.";
    rows.querySelectorAll(".client-edit").forEach(
      (button) =>
        (button.onclick = () =>
          openClientDialog(
            () => loadClients(),
            all.find((x) => String(x.id) === button.dataset.id),
          )),
    );
    rows.querySelectorAll(".client-delete").forEach(
      (button) =>
        (button.onclick = async () => {
          const client = all.find((x) => String(x.id) === button.dataset.id);
          if (!confirm("Remover o cliente " + client.nome + "?")) return;
          try {
            await demoData("/clients/" + client.id, { method: "DELETE" });
            loadClients();
          } catch (error) {
            toast(error.message, true);
          }
        }),
    );
    rows.querySelectorAll("[data-receive]").forEach(
      (button) =>
        (button.onclick = async () => {
          await render("receivables");
          const select = document.querySelector("#receive-client");
          if (select) {
            select.value = button.dataset.receive;
            select.dispatchEvent(new Event("change"));
          }
        }),
    );
  };
  search.oninput = sort.onchange = draw;
  draw();
  document.querySelector("#new-client").onclick = () =>
    openClientDialog(() => loadClients());
}

function openClientDialog(onSaved, clientToEdit = null) {
  const dialog = document.querySelector("#client-dialog"),
    form = dialog.querySelector("form"),
    status = document.querySelector("#client-status"),
    save = document.querySelector("#save-client");
  form.reset();
  document.querySelector("#c-name").value = clientToEdit?.nome || "";
  document.querySelector("#c-phone").value = clientToEdit?.telefone || "";
  document.querySelector("#c-document").value = clientToEdit?.cpf_cnpj || "";
  document.querySelector("#c-address").value = clientToEdit?.endereco || "";
  dialog.querySelector("h2").textContent = clientToEdit
    ? "Editar cliente"
    : "Novo cliente";
  status.textContent = "";
  save.disabled = false;
  save.textContent = clientToEdit ? "Salvar alterações" : "Salvar cliente";
  dialog.showModal();
  form.onsubmit = async (event) => {
    if (event.submitter?.id !== "save-client") return;
    event.preventDefault();
    const payload = {
      nome: document.querySelector("#c-name").value.trim(),
      telefone: document.querySelector("#c-phone").value.trim(),
      cpf_cnpj: document.querySelector("#c-document").value.trim(),
      endereco: document.querySelector("#c-address").value.trim(),
    };
    if (!payload.nome) {
      status.textContent = "Informe o nome do cliente.";
      return;
    }
    save.disabled = true;
    save.textContent = "Salvando…";
    status.textContent = "";
    try {
      const result = await demoData(
          "/clients" + (clientToEdit ? "/" + clientToEdit.id : ""),
          {
            method: clientToEdit ? "PUT" : "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          },
        ),
        client = clientToEdit
          ? { ...clientToEdit, ...payload }
          : result.cliente || { ...payload, id: result.id, saldo_fiado: 0 };
      status.textContent = clientToEdit
        ? "Cliente atualizado."
        : result.existente
          ? "Cliente já existia e foi selecionado."
          : "Cliente salvo e selecionado.";
      setTimeout(() => {
        dialog.close();
        onSaved?.(client);
      }, 250);
    } catch (error) {
      status.textContent =
        error.message || "Não foi possível salvar o cliente.";
      save.disabled = false;
      save.textContent = clientToEdit ? "Salvar alterações" : "Salvar cliente";
    }
  };
}

let productDisplay = "cards",
  productFilter = "",
  productSort = "nome",
  productPage = 1;
async function loadProducts() {
  const products = await todosProdutos(),
    active = products.filter((x) => x.situacao !== "Inativo"),
    low = active.filter((x) => Number(x.estoque) <= 5);
  document.querySelector("#products-stats").innerHTML =
    metric(
      "Produtos ativos",
      active.length,
      products.length - active.length + " inativos",
    ) +
    metric("Estoque baixo", low.length, "5 unidades ou menos", "amber") +
    metric(
      "Valor em estoque",
      money(
        active.reduce((sum, x) => sum + Number(x.preco) * Number(x.estoque), 0),
      ),
      "a preço de venda",
      "green",
    ) +
    metric(
      "Categorias",
      new Set(products.map((x) => x.categoria).filter(Boolean)).size,
      "no catálogo",
      "violet",
    );
  document.querySelector("#product-alerts").innerHTML = low.length
    ? '<div class="alert hoje" style="margin-bottom:16px"><div class="ai">' +
      ic("alert", 22) +
      '</div><div class="at"><b>' +
      low.length +
      " produtos com estoque baixo ou zerado</b><small>" +
      escape(
        low
          .slice(0, 3)
          .map((x) => x.descricao)
          .join(", "),
      ) +
      '</small></div><button class="btn sm" id="show-low">Ver produtos</button></div>'
    : "";
  document.querySelector("#show-low")?.addEventListener("click", () => {
    productFilter = "__low";
    productPage = 1;
    draw();
  });
  const search = document.querySelector("#product-search"),
    sort = document.querySelector("#product-sort");
  sort.value = productSort;
  const draw = () =>
    listProducts(search.value, productPage, (next) => {
      productPage = next;
      draw();
    });
  search.oninput = () => {
    productPage = 1;
    draw();
  };
  sort.onchange = () => {
    productSort = sort.value;
    productPage = 1;
    draw();
  };
  document.querySelectorAll("[data-product-view]").forEach(
    (button) =>
      (button.onclick = () => {
        productDisplay = button.dataset.productView;
        draw();
      }),
  );
  document.querySelector("#new-product").onclick = () => openProduct();
  draw();
}
async function listProducts(term, page = 1, onPageChange) {
  const all = await todosProdutos(),
    products = all
      .filter(
        (product) =>
          correspondeBusca(product, term, [
            "descricao",
            "codigo",
            "ean",
            "categoria",
          ]) &&
          (!productFilter ||
            (productFilter === "__low"
              ? product.situacao !== "Inativo" && product.estoque <= 5
              : productFilter === "__inactive"
                ? product.situacao === "Inativo"
                : product.categoria === productFilter)),
      )
      .sort((a, b) =>
        productSort === "preco"
          ? b.preco - a.preco
          : productSort === "estoque"
            ? a.estoque - b.estoque
            : a.descricao.localeCompare(b.descricao, "pt-BR"),
      ),
    perPage = 12,
    totalPages = Math.max(1, Math.ceil(products.length / perPage)),
    current = Math.min(Math.max(1, page), totalPages),
    visible = products.slice((current - 1) * perPage, current * perPage),
    rows = document.querySelector("#product-rows");
  if (!rows) return;
  const categories = [
    ...new Set(all.map((x) => x.categoria).filter(Boolean)),
  ].sort();
  document.querySelector("#product-chips").innerHTML = [
    ["", "Todas"],
    ...categories.map((x) => [x, x]),
    ["__low", "Estoque baixo"],
    ["__inactive", "Inativos"],
  ]
    .map(
      ([id, label]) =>
        '<button class="chip ' +
        (productFilter === id ? "on" : "") +
        '" data-product-filter="' +
        escape(id) +
        '">' +
        escape(label) +
        "</button>",
    )
    .join("");
  document.querySelectorAll("[data-product-filter]").forEach(
    (button) =>
      (button.onclick = () => {
        productFilter = button.dataset.productFilter;
        productPage = 1;
        listProducts(term, 1, onPageChange);
      }),
  );
  document
    .querySelectorAll("[data-product-view]")
    .forEach((button) =>
      button.classList.toggle(
        "on",
        button.dataset.productView === productDisplay,
      ),
    );
  document.querySelector("#product-cards").hidden = productDisplay !== "cards";
  document.querySelector("#product-table").hidden = productDisplay !== "table";
  document.querySelector("#product-cards").innerHTML =
    visible
      .map((product) => {
        const color =
          product.estoque <= 0
            ? "red"
            : product.estoque <= 5
              ? "amber"
              : "green";
        return (
          '<article class="pr-card ' +
          (product.situacao === "Inativo" ? "off" : "") +
          '"><button class="product-card-main" data-edit-product="' +
          product.id +
          '"><div class="pr-top"><div class="pico" style="background:color-mix(in srgb,var(--' +
          color +
          ") 15%,transparent);color:var(--" +
          color +
          ')">' +
          ic("box") +
          '</div><span class="pill ' +
          (product.situacao === "Inativo" ? "p-gray" : "p-green") +
          '">' +
          escape(product.situacao || "Ativo") +
          '</span></div><div class="pr-name">' +
          escape(product.descricao) +
          '</div><div class="pr-sub">' +
          escape(product.categoria || "Sem categoria") +
          " · " +
          escape(product.codigo || "sem código") +
          '</div><div class="pr-price">' +
          money(product.preco) +
          " <small>/ " +
          escape(product.unidade || "UN") +
          '</small></div></button><div><div class="sbar"><b style="width:' +
          Math.max(0, Math.min(100, (Number(product.estoque) / 60) * 100)) +
          "%;background:var(--" +
          color +
          ')"></b></div><div class="pr-meta" style="margin-top:7px"><span>' +
          Number(product.estoque || 0) +
          ' em estoque</span><button class="btn sm danger" data-delete-product="' +
          product.id +
          '">Remover</button></div></div></article>'
        );
      })
      .join("") || '<p class="empty-row">Nenhum produto encontrado.</p>';
  rows.innerHTML = visible
    .map(
      (product) =>
        "<tr><td><b>" +
        escape(product.descricao) +
        "</b><small>" +
        escape(product.categoria || "Sem categoria") +
        "</small></td><td>" +
        escape(product.codigo || "—") +
        "</td><td>" +
        Number(product.estoque || 0) +
        " " +
        escape(product.unidade || "UN") +
        '</td><td class="money">' +
        money(product.preco) +
        '</td><td><button class="btn sm" data-edit-product="' +
        product.id +
        '">Editar</button><button class="btn sm danger" data-delete-product="' +
        product.id +
        '">Remover</button></td></tr>',
    )
    .join("");
  document.querySelector("#empty-products").textContent = products.length
    ? ""
    : "Nenhum produto encontrado.";
  document
    .querySelectorAll("[data-edit-product]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openProduct(
            all.find((x) => String(x.id) === button.dataset.editProduct),
          )),
    );
  document.querySelectorAll("[data-delete-product]").forEach(
    (button) =>
      (button.onclick = async () => {
        const product = all.find(
          (x) => String(x.id) === button.dataset.deleteProduct,
        );
        if (
          !confirm(
            "Remover " +
              product.descricao +
              " do catálogo? O histórico de vendas será preservado.",
          )
        )
          return;
        try {
          await demoData("/products/" + product.id, { method: "DELETE" });
          productCache = null;
          await loadProducts();
          toast("Produto removido.");
        } catch (error) {
          toast(error.message, true);
        }
      }),
  );
  const pagination = document.querySelector("#product-pagination");
  pagination.hidden = !products.length;
  pagination.innerHTML =
    '<button class="btn sm" id="products-prev" ' +
    (current === 1 ? "disabled" : "") +
    ">← Anterior</button><span>Página " +
    current +
    " de " +
    totalPages +
    " · " +
    products.length +
    ' produtos</span><button class="btn sm" id="products-next" ' +
    (current === totalPages ? "disabled" : "") +
    ">Próxima →</button>";
  document.querySelector("#products-prev").onclick = () =>
    current > 1 &&
    (onPageChange
      ? onPageChange(current - 1)
      : listProducts(term, current - 1));
  document.querySelector("#products-next").onclick = () =>
    current < totalPages &&
    (onPageChange
      ? onPageChange(current + 1)
      : listProducts(term, current + 1));
}

function escape(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function openProduct(p) {
  editing = p || null;
  const dialog = document.querySelector("#product-dialog");
  document.querySelector("#dialog-title").textContent = p
    ? "Editar produto"
    : "Novo produto";
  [
    "code",
    "unit",
    "description",
    "price",
    "stock",
    "category",
    "status",
  ].forEach(
    (key) =>
      (document.querySelector("#f-" + key).value = p
        ? ({
            code: p.codigo,
            unit: p.unidade,
            description: p.descricao,
            price: p.preco,
            stock: p.estoque,
            category: p.categoria,
            status: p.situacao,
          }[key] ?? "")
        : key === "unit"
          ? "UN"
          : key === "stock"
            ? "0"
            : key === "status"
              ? "Ativo"
              : ""),
  );
  if (!p) {
    const codeField = document.querySelector("#f-code");
    codeField.value = "Gerando código…";
    codeField.readOnly = true;
    try {
      codeField.value = (await demoData("/products/next-code")).codigo;
    } catch (error) {
      const products = await todosProdutos();
      const used = new Set(
        products
          .map((product) => String(product.codigo || "").trim())
          .filter((code) => /^\\d+$/.test(code))
          .map(Number),
      );
      let next = 1;
      while (used.has(next)) next++;
      codeField.value = String(next);
    }
    codeField.readOnly = false;
  }
  dialog.showModal();
  dialog.querySelector("form").onsubmit = async (event) => {
    if (event.submitter?.id !== "save-product") return;
    event.preventDefault();
    const data = {
      codigo: f("code"),
      unidade: f("unit"),
      descricao: f("description"),
      preco: f("price"),
      estoque: f("stock"),
      categoria: f("category"),
      situacao: f("status"),
    };
    try {
      await demoData("/products" + (editing ? "/" + editing.id : ""), {
        method: editing ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      toast(error.message, true);
      return;
    }
    dialog.close();
    productCache = null;
    await loadProducts();
    toast("Produto salvo.");
  };
}
const f = (k) => document.querySelector("#f-" + k).value;
async function setupSale() {
  const historical = document.querySelector("#historical-sale"), historicalDate = document.querySelector("#historical-sale-date");
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  historicalDate.max = dateKey(yesterday);
  historical.onchange = () => {
    document.querySelector("#historical-sale-field").hidden = !historical.checked;
    if (historical.checked) document.querySelector('[data-payment="fiado"]').click();
    else historicalDate.value = "";
  };
  const search = document.querySelector("#sale-search"),
    suggestions = document.querySelector("#suggestions"),
    payment = document.querySelector("#payment"),
    quickClient = document.querySelector("#quick-client"),
    finishButton = document.querySelector("#finish-sale"),
    clientSearch = document.querySelector("#sale-client-search"),
    clientSuggestions = document.querySelector("#client-suggestions"),
    selectedClientLabel = document.querySelector("#selected-client"),
    discountInput = document.querySelector("#discount-input"),
    deliveryInput = document.querySelector("#delivery-fee"),
    cashInput = document.querySelector("#cash-received"),
    changePanel = document.querySelector("#change-panel"),
    scanButton = document.querySelector("#scan-barcode");
  let clientsCache = [];
  try {
    clientsCache = await demoData("/clients");
  } catch (error) {
    if (error.name === "AbortError") throw error;
    toast(error.message, true);
  }
  const selectClient = (client) => {
    selectedClient = client;
    clientSearch.value = client.nome;
    document.querySelector("#withdrawn-by").value = client.nome;
    clientSuggestions.innerHTML = "";
    selectedClientLabel.textContent =
      "Cliente selecionado: " +
      client.nome +
      (client.telefone ? " · " + client.telefone : "");
    selectedClientLabel.hidden = false;
    quickClient.textContent = "Cadastrar outro cliente";
  };
  const renderClientMatches = () => {
    const term = clientSearch.value.trim();
    if (!term) {
      clientSuggestions.innerHTML = "";
      return;
    }
    const matches = clientsCache
      .filter((client) =>
        correspondeBusca(client, term, ["nome", "telefone", "cpf_cnpj"]),
      )
      .slice(0, 6);
    clientSuggestions.innerHTML = matches.length
      ? matches
          .map(
            (client) =>
              '<button type="button" data-id="' +
              client.id +
              '"><b>' +
              escape(client.nome) +
              "</b><span>" +
              escape(client.telefone || client.cpf_cnpj || "Sem telefone/CPF") +
              "</span></button>",
          )
          .join("")
      : "<p>Nenhum cliente encontrado. Use “Cadastrar cliente”.</p>";
    clientSuggestions
      .querySelectorAll("button")
      .forEach(
        (button) =>
          (button.onclick = () =>
            selectClient(
              clientsCache.find(
                (client) => String(client.id) === button.dataset.id,
              ),
            )),
      );
  };
  const resetSale = () => {
    historical.checked = false;
    historicalDate.value = "";
    document.querySelector("#historical-sale-field").hidden = true;
    cart = [];
    selected = null;
    selectedClient = null;
    search.value = "";
    suggestions.innerHTML = "";
    suggestions.classList.remove("open");
    payment.value = "pix";
    syncPaymentOptions();
    saleDiscount = 0;
    discountInput.value = "";
    deliveryInput.value = "";
    cashInput.value = "";
    changePanel.hidden = true;
    clientSearch.value = "";
    document.querySelector("#withdrawn-by").value = "";
    clientSuggestions.innerHTML = "";
    selectedClientLabel.hidden = true;
    selectedClientLabel.textContent = "";
    quickClient.textContent = "+ Cadastrar cliente";
    finishButton.disabled = false;
    finishButton.textContent = "Finalizar venda";
    drawCart();
    search.focus();
  };
  const updateChange = () => {
    const gross =
        cartGross() -
        discountAmount() +
        Math.max(0, parseAmount(deliveryInput.value) || 0),
      received = Math.max(0, parseAmount(cashInput.value) || 0);
    document.querySelector("#change-value").textContent = money(
      Math.max(0, received - gross),
    );
    document.querySelector("#cash-shortage").textContent =
      received && received < gross
        ? "Faltam " + money(gross - received) + " para concluir."
        : "";
  };
  const paymentOptions = document.querySelectorAll("[data-payment]");
  const syncPaymentOptions = () =>
    paymentOptions.forEach((button) =>
      button.classList.toggle("on", button.dataset.payment === payment.value),
    );
  paymentOptions.forEach(
    (button) =>
      (button.onclick = () => {
        payment.value = button.dataset.payment;
        payment.dispatchEvent(new Event("change"));
      }),
  );
  payment.onchange = () => {
    syncPaymentOptions();
    changePanel.hidden = payment.value !== "dinheiro";
    if (payment.value === "fiado" && !selectedClient) clientSearch.focus();
    updateChange();
  };
  cashInput.oninput = updateChange;
  discountInput.oninput = () => {
    saleDiscount = parseAmount(discountInput.value);
    drawCart();
  };
  deliveryInput.oninput = () => drawCart();
  clientSearch.oninput = () => {
    if (
      selectedClient &&
      normalizarBusca(clientSearch.value) !==
        normalizarBusca(selectedClient.nome)
    ) {
      document.querySelector("#withdrawn-by").value = "";
      selectedClient = null;
      selectedClientLabel.hidden = true;
      selectedClientLabel.textContent = "";
      quickClient.textContent = "+ Cadastrar cliente";
    }
    renderClientMatches();
  };
  clientSearch.onkeydown = (event) => {
    if (event.key === "Enter") {
      const first = clientSuggestions.querySelector("button");
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  };
  quickClient.onclick = () =>
    openClientDialog((client) => {
      const index = clientsCache.findIndex(
        (item) => String(item.id) === String(client.id),
      );
      if (index >= 0) clientsCache[index] = client;
      else clientsCache.push(client);
      selectClient(client);
    });
  const addProduct = (product) => {
    const quantity = 1;
    const existing = cart.find(
      (item) =>
        String(item.codigo) === String(product.codigo) &&
        item.produto === product.descricao &&
        Number(item.preco) === Number(product.preco),
    );
    if (existing) existing.quantidade += quantity;
    else
      cart.push({
        produto_id: product.id,
        codigo: product.codigo,
        produto: product.descricao,
        quantidade: quantity,
        preco: Number(product.preco),
      });
    selected = null;
    search.value = "";
    suggestions.innerHTML = "";
    suggestions.classList.remove("open");
    drawCart();
    search.focus();
  };
  const stopScanner = () => {
    const video = document.querySelector("#barcode-video");
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  };
  scanButton.onclick = () => demoNotice();
  const renderProductCatalog = async () => {
    const term = search.value.trim();
    if (!term) {
      suggestions.innerHTML = "";
      suggestions.classList.remove("open");
      return;
    }
    const all = await todosProdutos(),
      products = all
        .filter(
          (product) =>
            product.situacao !== "Inativo" &&
            correspondeBusca(product, term, [
              "descricao",
              "codigo",
              "ean",
              "categoria",
            ]),
        )
        .slice(0, 10);
    suggestions.innerHTML =
      products
        .map(
          (product) =>
            '<button type="button" class="suggestion sug" data-id="' +
            product.id +
            '"><span class="sm"><b>' +
            escape(product.descricao) +
            "</b><small>Cód. " +
            escape(product.codigo || "—") +
            (product.categoria ? " · " + escape(product.categoria) : "") +
            '</small></span><span class="sp">' +
            money(product.preco) +
            "<small>Adicionar</small></span></button>",
        )
        .join("") || '<p class="no-result">Nenhum produto encontrado.</p>';
    suggestions.classList.add("open");
    suggestions
      .querySelectorAll(".suggestion")
      .forEach(
        (element) =>
          (element.onclick = () =>
            addProduct(
              products.find(
                (product) => String(product.id) === element.dataset.id,
              ),
            )),
      );
  };
  search.oninput = renderProductCatalog;
  search.onkeydown = (event) => {
    if (event.key === "Enter") {
      const first = suggestions.querySelector(".suggestion");
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  };
  finishButton.onclick = async () => {
    if (!cart.length) return alert("Adicione pelo menos um produto.");
    const forma = payment.value;
    if (historical.checked && (!historicalDate.value || historicalDate.value >= dateKey())) return alert("Informe a data original da compra, anterior a hoje.");
    if (historical.checked && forma !== "fiado") return alert("Para registrar uma compra antiga, selecione A prazo.");
    if (forma === "fiado" && !selectedClient)
      return alert("Para venda a prazo, localize ou cadastre o cliente.");
    const withdrawnBy = document.querySelector("#withdrawn-by").value.trim();
    if (forma === "dinheiro") {
      const received = parseAmount(cashInput.value);
      const total =
        cartGross() -
        discountAmount() +
        Math.max(0, parseAmount(deliveryInput.value) || 0);
      if (!Number.isFinite(received) || received < total)
        return toast("Informe o valor recebido suficiente para a venda.", true);
    }
    if (forma === "fiado" && !withdrawnBy)
      return alert("Informe o nome de quem retirou os produtos.");
    finishButton.disabled = true;
    finishButton.textContent = "Registrando venda…";
    try {
      const gross = cartGross(),
        totalDiscount = Number(discountAmount().toFixed(2));
      let allocated = 0;
      const items = cart.map((item, index) => {
        const discount =
          index === cart.length - 1
            ? Number((totalDiscount - allocated).toFixed(2))
            : Number(
                (
                  (totalDiscount * (item.preco * item.quantidade)) /
                  gross
                ).toFixed(2),
              );
        allocated = Number((allocated + discount).toFixed(2));
        return { ...item, desconto: discount };
      });
      const result = await demoData("/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itens: items,
          forma_pagamento: forma,
          ...(historical.checked ? { data_compra: historicalDate.value } : {}),
          cliente_id: selectedClient?.id,
          retirado_por: withdrawnBy,
          taxa_entrega: Math.max(0, parseAmount(deliveryInput.value) || 0),
        }),
      });
      currentSale = result.venda_id;
      resetSale();
      const dialog = document.querySelector("#receipt-dialog");
      document.querySelector("#receipt-message").textContent = result.mensagem;
      document.querySelector("#print-receipt").onclick = () =>
        print(currentSale, true);
      document.querySelector("#print-order").onclick = () =>
        print(currentSale, false);
      const whats = document.querySelector("#send-whatsapp");
      whats.hidden = !result.cliente?.telefone;
      whats.onclick = () =>
        sendWhatsApp(currentSale, result.cliente, withdrawnBy);
      dialog.showModal();
    } catch (error) {
      alert(error.message || "Não foi possível finalizar a venda.");
      finishButton.disabled = false;
      finishButton.textContent = "Finalizar venda";
    }
  };
  document.querySelector("#cart-clear").onclick = () => {
    if (!cart.length) return;
    cart = [];
    drawCart();
  };
  document.querySelector("#open-payment").onclick = () =>
    document.querySelector(".p-cart").classList.add("open");
  document.querySelector("#close-payment").onclick = () =>
    document.querySelector(".p-cart").classList.remove("open");
  if (selectedClient) selectClient(selectedClient);
  discountInput.value = saleDiscount || "";
  drawCart();
  renderProductCatalog();
  syncPaymentOptions();
  search.focus();
}
function cartGross() {
  return cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
}
function discountAmount() {
  const gross = cartGross(),
    value = Math.max(0, parseAmount(saleDiscount) || 0);
  return Math.min(gross, value);
}
let drawingCart = false;
function drawCart() {
  // Removing a focused quantity field can synchronously emit another change event.
  if (drawingCart) return;
  drawingCart = true;
  try {
    const box = document.querySelector("#cart"),
      gross = cartGross(),
      discount = discountAmount(),
      delivery = Math.max(
        0,
        parseAmount(document.querySelector("#delivery-fee")?.value) || 0,
      ),
      total = Math.max(0, gross - discount) + delivery,
      count = cart.reduce((sum, item) => sum + item.quantidade, 0);
    box.classList.toggle("empty", !cart.length);
    box.innerHTML = cart.length
      ? cart
          .map(
            (item, index) =>
              '<article class="pl"><span class="pl-n">' +
              (index + 1) +
              '</span><div class="pl-main"><b>' +
              escape(item.produto) +
              "</b><small>Cód. " +
              escape(item.codigo || "—") +
              " · " +
              money(item.preco) +
              ' por unidade</small></div><div class="qty"><button type="button" data-decrease="' +
              index +
              '" aria-label="Diminuir">−</button><input data-quantity="' +
              index +
              '" type="number" min="1" step="1" value="' +
              item.quantidade +
              '" aria-label="Quantidade"><button type="button" data-increase="' +
              index +
              '" aria-label="Aumentar">+</button></div><button type="button" class="pl-tot" data-price-index="' +
              index +
              '" title="Alterar preço">' +
              money(item.preco * item.quantidade) +
              '</button><button type="button" class="rm" aria-label="Remover item" data-i="' +
              index +
              '">×</button></article>',
          )
          .join("")
      : '<div class="empty"><b>Seu carrinho está vazio</b><p>Busque um produto acima para começar a venda.</p></div>';
    box.querySelectorAll("button[data-i]").forEach(
      (button) =>
        (button.onclick = () => {
          cart.splice(Number(button.dataset.i), 1);
          drawCart();
        }),
    );
    box.querySelectorAll("button[data-decrease]").forEach(
      (button) =>
        (button.onclick = () => {
          const item = cart[Number(button.dataset.decrease)];
          item.quantidade = Math.max(1, item.quantidade - 1);
          drawCart();
        }),
    );
    box.querySelectorAll("button[data-increase]").forEach(
      (button) =>
        (button.onclick = () => {
          const item = cart[Number(button.dataset.increase)];
          item.quantidade += 1;
          drawCart();
        }),
    );
    box.querySelectorAll("input[data-quantity]").forEach(
      (input) =>
        (input.onchange = () => {
          const item = cart[Number(input.dataset.quantity)],
            quantity = Number(input.value);
          item.quantidade =
            Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
          drawCart();
        }),
    );
    box
      .querySelectorAll("[data-price-index]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            openQuickPrice(Number(button.dataset.priceIndex))),
      );
    document.querySelector("#sale-subtotal").textContent = money(gross);
    document.querySelector("#sale-discount-value").textContent =
      "− " + money(discount);
    document.querySelector("#sale-discount-row").hidden = discount <= 0;
    document.querySelector("#sale-delivery-value").textContent =
      "+ " + money(delivery);
    document.querySelector("#sale-delivery-row").hidden = delivery <= 0;
    document.querySelector("#sale-total").textContent = money(total);
    document.querySelector("#cart-count").textContent = count
      ? count + " item(ns)"
      : "Nenhum item";
    document.querySelector("#cart-count-badge").textContent = count;
    document.querySelector("#cart-clear").disabled = !cart.length;
    document.querySelector("#mobile-cart-count").textContent =
      count + " item(ns)";
    document.querySelector("#mobile-sale-total").textContent = money(total);
    document.querySelector("#open-payment").disabled = !cart.length;
    document.querySelector("#finish-sale").disabled = !cart.length;
    document.querySelector("#cash-received").dispatchEvent(new Event("input"));
  } finally {
    drawingCart = false;
  }
}
async function openQuickPrice(index) {
  const item = cart[index];
  if (!item?.produto_id)
    return alert(
      "Este item foi incluído antes da atualização. Remova-o e adicione novamente para editar o preço.",
    );
  const dialog = document.querySelector("#quick-price-dialog"),
    input = document.querySelector("#quick-price"),
    name = document.querySelector("#quick-price-name"),
    status = document.querySelector("#quick-price-status"),
    save = document.querySelector("#save-quick-price");
  name.textContent = item.produto;
  input.value = Number(item.preco).toFixed(2).replace(".", ",");
  status.textContent = "";
  save.disabled = false;
  dialog.showModal();
  input.select();
  dialog.querySelector("form").onsubmit = async (event) => {
    if (event.submitter?.id !== "save-quick-price") return;
    event.preventDefault();
    const rawPrice = String(input.value).replace(/[^\d,\.]/g, "");
    const price = rawPrice.includes(",")
      ? Number(rawPrice.replace(/\./g, "").replace(",", "."))
      : Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
      status.textContent = "Informe um preço válido.";
      return;
    }
    save.disabled = true;
    save.textContent = "Atualizando…";
    try {
      const products = await todosProdutos(),
        product = products.find(
          (entry) => String(entry.id) === String(item.produto_id),
        );
      if (!product)
        throw new Error(
          "Produto não encontrado. Atualize a tela e tente novamente.",
        );
      await demoData("/products/" + product.id, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...product, preco: price }),
      });
      cart
        .filter((entry) => String(entry.produto_id) === String(product.id))
        .forEach((entry) => (entry.preco = price));
      productCache = null;
      dialog.close();
      save.textContent = "Atualizar preço";
      drawCart();
    } catch (error) {
      status.textContent =
        error.message || "Não foi possível atualizar o preço.";
      save.disabled = false;
      save.textContent = "Atualizar preço";
    }
  };
}

function sendWhatsApp(){ demoNotice(); }
document
  .querySelectorAll("[data-view]")
  .forEach((x) => (x.onclick = () => render(x.dataset.view)));

function formatDocumentDate(value) {
  const parsed = new Date(String(value || "").replace(" ", "T") + "-03:00");
  return Number.isNaN(parsed.getTime())
    ? String(value || "")
    : parsed.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      });
}
document.querySelector("#open-command").onclick = openCommand;
updateClock();
setInterval(updateClock, 20000);
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommand();
  }
  if (event.key === "F2") {
    event.preventDefault();
    if (currentView === "sale") document.querySelector("#sale-search")?.focus();
    else render("sale");
  }
  if (event.key === "F9" && currentView === "sale") {
    event.preventDefault();
    document.querySelector("#finish-sale")?.click();
  }
});
window.addEventListener("hashchange", () => {
  const target = location.hash.replace(/^#\/?/, "") || "dashboard";
  if (target !== currentView) render(target);
});
render(location.hash.replace(/^#\/?/, "") || "dashboard");

const guarded = new WeakMap();
function guardActions() {
  document
    .querySelectorAll("button,form,input,select,tr.sale-row")
    .forEach((el) =>
      ["onclick", "onsubmit", "onchange", "oninput", "onkeydown"].forEach(
        (key) => {
          const handler = el[key];
          if (!handler || guarded.get(handler)) return;
          const safe = function (event) {
            try {
              const result = handler.call(this, event);
              if (result?.catch)
                result.catch((error) => {
                  if (error.name !== "AbortError")
                    toast(
                      error.message || "Não foi possível concluir a operação.",
                      true,
                    );
                });
            } catch (error) {
              toast(error.message, true);
            }
          };
          guarded.set(safe, true);
          el[key] = safe;
        },
      ),
    );
}
new MutationObserver(guardActions).observe(document.body, {
  childList: true,
  subtree: true,
});

document
  .querySelectorAll("[data-inbound-close]")
  .forEach(
    (button) => (button.onclick = () => button.closest("dialog").close()),
  );
