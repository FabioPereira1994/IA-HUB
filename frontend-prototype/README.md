# Protótipo de front-end (Dashboard + Inbox)

Componente React único, com dados mockados, usado para validar o design
do Dashboard (Módulo 2) e do Inbox (Módulo 3) antes de existir uma API.

**Status:** ainda não conectado ao backend — os dados de conversas,
clientes e KPIs neste arquivo são fixos (mock).

**Próximo passo:** trocar os dados mockados por chamadas reais a:

- `GET /api/dashboard?range=hoje|7dias|30dias`
- `GET /api/conversas`, `GET /api/conversas/:id`
- `POST /api/conversas/:id/mensagens`, `/transferir`, `/encerrar`, `/notas`

O formato dos dados já foi desenhado para bater com o que essas rotas
devolvem — a troca é essencialmente substituir os arrays mockados por
`fetch()`/`useEffect()`.
