# Demonstração visual V4

Interface de exemplo de vendas, estoque e gestão. A empresa, clientes, fornecedores, produtos e valores são fictícios.

Esta versão reutiliza os templates, componentes, modais e os quatro estilos do front-end V4. As fontes Bricolage Grotesque e Hanken Grotesk são servidas localmente, com suas licenças. O JavaScript de apresentação usa uma fonte fictícia em memória; integrações de rede, documentos e dispositivos foram removidas.

Esta demonstração não contém o sistema operacional da empresa, banco, APIs, credenciais ou documentos reais. O carrinho é uma simulação em memória; recarregar a página limpa os itens. Botões administrativos apenas abrem avisos. Não digite informações reais.

## Visualizar

Abra `demo/index.html` no navegador ou sirva a pasta `demo` com um servidor estático. Todos os caminhos são relativos, inclusive em GitHub Pages.

## GitHub Pages

Use Settings → Pages → Source: GitHub Actions. O workflow `demo-pages.yml` publica exclusivamente `demo/` a partir de `refactor/remove-bling`. A raiz, outras pastas e o histórico não entram no artefato. Não selecione a raiz do repositório como fonte de Pages.

Este repositório público deve conter apenas a demo e a infraestrutura estática de sua publicação. Nenhuma dependência do projeto de produção é necessária.
