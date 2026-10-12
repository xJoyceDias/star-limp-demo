// Completely invented data. No network, database, storage or credentials.
window.DemoConfig=Object.freeze({operatorName:'Visitante'});
const demoDate=(offset=0)=>{const date=new Date();date.setDate(date.getDate()+offset);return date.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});};
const demoProducts=Array.from({length:24},(_,i)=>({id:i+1,codigo:'DEMO-'+String(i+1).padStart(3,'0'),descricao:['Produto Exemplo A','Produto Exemplo B','Kit Demonstração','Acessório Exemplo'][i%4]+(i>3?' '+(i+1):''),unidade:'UN',preco:[18,32,65,9][i%4],estoque:i===3?3:20+i,situacao:'Ativo',preco_custo:[10,20,40,5][i%4],fornecedor:'Fornecedor Exemplo '+(i%2?'B':'A'),marca:'Marca de Exemplo',categoria:['Linha básica','Linha premium','Kits','Acessórios'][i%4],ean:''}));
const demoClients=Array.from({length:6},(_,i)=>({id:i+1,nome:'Cliente Exemplo '+String.fromCharCode(65+i),telefone:'',cpf_cnpj:'',endereco:'',saldo_fiado:i<3?[180,90,45][i]:0,data_cadastro:demoDate(-30)}));
const demoSales=Array.from({length:12},(_,i)=>({id:12-i,data_hora:demoDate(-Math.floor(i/2))+' 10:30:00',valor_total:[90,65,180,36,128,195][i%6],forma_pagamento:['pix','dinheiro','fiado','debito','credito','pix'][i%6],cliente_id:i%6+1,cliente_nome:demoClients[i%6].nome,status:'CONCLUIDA',quantidade_itens:2,taxa_entrega:0,retirado_por:'Pessoa de Exemplo'}));
const demoSuppliers=[{id:1,nome:'Fornecedor Exemplo A',cpf_cnpj:'',telefone:'',email:'',endereco:'',ativo:1},{id:2,nome:'Fornecedor Exemplo B',cpf_cnpj:'',telefone:'',email:'',endereco:'',ativo:1}];
const demoPayables=Array.from({length:5},(_,i)=>({id:i+1,fornecedor:demoSuppliers[i%2].nome,descricao:'Compra de exemplo '+(i+1),valor:[300,180,90,120,65][i],valor_pago:i===4?65:0,saldo_aberto:i===4?0:[300,180,90,120][i],status:i===4?'PAGO':'ABERTO',vencimento:demoDate([-3,0,2,5,-1][i]),parcela:1,total_parcelas:1,linha_digitavel:'',banco_previsto:'Banco de Exemplo',observacao:'Registro fictício',baixas:[],settlements:[]}));
const demoEntries=[{id:1,numero:1,fornecedor_id:1,fornecedor_nome:demoSuppliers[0].nome,fornecedor_documento:'',data_entrada:demoDate(-2),criado_em:demoDate(-2)+' 09:00:00',numero_documento:'DEMO-E01',origem:'MANUAL',total:300,status:'CONFIRMADA',serie:'',chave_acesso:'',observacao:'Entrada ilustrativa'}];
const demoOrders=[{id:1,numero:1,fornecedor_id:2,fornecedor_nome:demoSuppliers[1].nome,fornecedor_documento:'',data:demoDate(-1),criado_em:demoDate(-1)+' 09:00:00',previsao_entrega:demoDate(3),numero_pedido:'DEMO-P01',total:180,status:'ENVIADO',observacao:'Pedido ilustrativo'}];
const demoItems=()=>[{id:1,produto_id:1,codigo:'DEMO-001',descricao:demoProducts[0].descricao,unidade:'UN',quantidade:3,preco_unitario:18,subtotal:54,custo_unitario:10,desconto:0,recebido:0},{id:2,produto_id:2,codigo:'DEMO-002',descricao:demoProducts[1].descricao,unidade:'UN',quantidade:2,preco_unitario:32,subtotal:64,custo_unitario:20,desconto:0,recebido:0}];
const demoCopy=value=>JSON.parse(JSON.stringify(value));
async function demoRead(route,options={}) {
  if(typeof connection==='function')connection(true);
  const method=options.method||'GET',id=Number(route.split('/')[2]);
  if(method!=='GET') {
    if(route==='/sales'&&method==='POST') {
      const data=JSON.parse(options.body),items=data.itens||[],total=Number((items.reduce((s,i)=>s+i.quantidade*i.preco-(i.desconto||0),0)+(data.taxa_entrega||0)).toFixed(2));
      const client=demoClients.find(c=>c.id===data.cliente_id)||null,newId=Math.max(...demoSales.map(s=>s.id))+1;
      const sale={id:newId,data_hora:(data.data_compra||demoDate())+' 10:30:00',valor_total:total,forma_pagamento:data.forma_pagamento,cliente_id:client?.id||null,cliente_nome:client?.nome||'Consumidor de Exemplo',retirado_por:'Pessoa de Exemplo',status:'CONCLUIDA',taxa_entrega:data.taxa_entrega||0,quantidade_itens:items.reduce((s,i)=>s+i.quantidade,0),demo_itens:items.map(i=>({descricao:i.produto,quantidade:i.quantidade,preco_unitario:i.preco,subtotal:i.quantidade*i.preco-(i.desconto||0)}))};
      demoSales.unshift(sale);
      return {sucesso:true,venda_id:newId,total,cliente:demoCopy(client),mensagem:'Simulação concluída. Nenhuma venda real foi enviada ou salva.'};
    }
    demoNotice();
    throw Error('Demonstração visual: nenhuma alteração foi salva.');
  }
  if(route==='/products')return demoCopy(demoProducts);
  if(route==='/products/next-code')return{codigo:'DEMO-025'};
  if(route==='/clients')return demoCopy(demoClients);
  if(route==='/sales')return demoCopy(demoSales);
  if(/^\/sales\/\d+$/.test(route)){const sale=demoSales.find(s=>s.id===id)||demoSales[0],client=demoClients.find(c=>c.id===sale.cliente_id);return demoCopy({venda:sale,cliente:client,itens:sale.demo_itens||demoItems(),fiado:sale.forma_pagamento==='fiado'?{retirado_por:'Pessoa de Exemplo',saldo_anterior:0,saldo_atual:180}:null});}
  if(route==='/receivables')return demoCopy(demoClients.filter(c=>c.saldo_fiado>0));
  if(/^\/receivables\/\d+$/.test(route)){const client=demoClients.find(c=>c.id===id)||demoClients[0];return demoCopy({cliente:client,compras:[{id:1,venda_id:1,data_hora:demoDate(-2)+' 10:30:00',valor_compra:client.saldo_fiado,saldo_aberto:client.saldo_fiado,pago_na_compra:0,status:'EM ABERTO',retirado_por:'Pessoa de Exemplo',itens:'Produtos de exemplo'}],pagamentos:[]});}
  if(route==='/dashboard'){const sum=list=>list.reduce((s,v)=>s+v.valor_total,0),weekStart=new Date();weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));const weekKey=weekStart.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});return{vendas_hoje:sum(demoSales.filter(s=>s.data_hora.startsWith(demoDate()))),vendas_semana:sum(demoSales.filter(s=>s.data_hora.slice(0,10)>=weekKey)),vendas_mes:sum(demoSales.filter(s=>s.data_hora.startsWith(demoDate().slice(0,7)))),total_receber:315,clientes_devendo:3,total_clientes:6};}
  if(route==='/payables')return demoCopy(demoPayables);
  if(route==='/payables/summary')return{pendente:{valor:690,quantidade:4},pago_mes:{valor:65,quantidade:1}};
  if(/^\/payables\/\d+/.test(route))return demoCopy(demoPayables.find(p=>p.id===id)||demoPayables[0]);
  if(route==='/suppliers')return demoCopy(demoSuppliers);
  if(/^\/suppliers\/\d+/.test(route))return demoCopy(demoSuppliers.find(s=>s.id===id)||demoSuppliers[0]);
  if(route==='/entries')return demoCopy(demoEntries);
  if(route==='/purchase-orders')return demoCopy(demoOrders);
  if(/^\/(entries|purchase-orders)\/\d+/.test(route)){const order=route.startsWith('/purchase-orders'),record=(order?demoOrders:demoEntries)[0];return demoCopy({...record,fornecedor:demoSuppliers[order?1:0],itens:demoItems(),contas:demoPayables.slice(0,2),entradas:[],parcelas:[],logs:[],historico:[]});}
  throw Error('Tela demonstrativa sem dados para esta ação.');
}
function demoNotice(){const dialog=document.querySelector('#demo-dialog');if(!dialog.open)dialog.showModal();}
function print(){demoNotice();}
function printPaymentReceipt(){demoNotice();}
function printSalesReport(){demoNotice();}
