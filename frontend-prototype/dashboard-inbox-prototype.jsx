import { useState, useEffect } from "react";
import {
  LayoutDashboard, Inbox, Users, Ticket, Zap, Settings, Lock, Search, Send,
  ArrowLeftRight, CheckCircle2, Clock, Phone, Tag, ShoppingBag, Bot,
  StickyNote, MessageSquareText, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ---------- Design tokens ---------- */
const tokens = {
  ink: "#12161C",
  paper: "#F4F5F7",
  surface: "#FFFFFF",
  line: "#E4E6EA",
  textPrimary: "#1B1F27",
  textSecondary: "#6B7280",
  teal: "#0E8C7F",
  tealSoft: "#E4F3F0",
  tealLight: "#5FC7B8",
  amber: "#C98A2E",
  amberSoft: "#FBF1DE",
  coral: "#D6485A",
  coralSoft: "#FBE7EA",
};

const fonts = {
  display: "'Space Grotesk', sans-serif",
  body: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

const statusMeta = {
  ia: { label: "IA", color: tokens.teal, bg: tokens.tealSoft },
  humano: { label: "Humano", color: tokens.amber, bg: tokens.amberSoft },
  pendente: { label: "Pendente", color: tokens.coral, bg: tokens.coralSoft },
};

/* ---------- Mock data ---------- */
const dashboardData = {
  hoje: {
    rangeLabel: "hoje", recebidas: 184, delta: "+12% vs. ontem",
    ia: 131, iaPct: 71, humano: 38, humanoPct: 21, pendente: 15, pendentePct: 8,
    leads: 22, leadsDelta: "+5 vs. ontem",
    tempoIA: "8s", tempoHumano: "3min 12s",
    conversaoCount: 9, conversaoTotal: 22, conversaoPct: 41,
    chamados: 6,
    chartLabel: "Conversas por hora",
    chart: [
      { label: "08h", ia: 4, humano: 1 }, { label: "09h", ia: 9, humano: 2 },
      { label: "10h", ia: 14, humano: 3 }, { label: "11h", ia: 12, humano: 4 },
      { label: "12h", ia: 8, humano: 2 }, { label: "13h", ia: 6, humano: 1 },
      { label: "14h", ia: 15, humano: 5 }, { label: "15h", ia: 17, humano: 6 },
      { label: "16h", ia: 13, humano: 4 }, { label: "17h", ia: 11, humano: 3 },
      { label: "18h", ia: 9, humano: 3 }, { label: "19h", ia: 8, humano: 2 },
      { label: "20h", ia: 5, humano: 2 },
    ],
  },
  "7dias": {
    rangeLabel: "últimos 7 dias", recebidas: 1141, delta: "+9% vs. semana anterior",
    ia: 811, iaPct: 71, humano: 235, humanoPct: 21, pendente: 95, pendentePct: 8,
    leads: 145, leadsDelta: "+14 vs. semana anterior",
    tempoIA: "9s", tempoHumano: "3min 40s",
    conversaoCount: 59, conversaoTotal: 145, conversaoPct: 41,
    chamados: 19,
    chartLabel: "Conversas por dia",
    chart: [
      { label: "Seg", ia: 118, humano: 34 }, { label: "Ter", ia: 126, humano: 36 },
      { label: "Qua", ia: 121, humano: 33 }, { label: "Qui", ia: 132, humano: 39 },
      { label: "Sex", ia: 145, humano: 42 }, { label: "Sáb", ia: 98, humano: 29 },
      { label: "Dom", ia: 71, humano: 22 },
    ],
  },
  "30dias": {
    rangeLabel: "últimos 30 dias", recebidas: 4696, delta: "+18% vs. mês anterior",
    ia: 3347, iaPct: 71, humano: 973, humanoPct: 21, pendente: 376, pendentePct: 8,
    leads: 598, leadsDelta: "+62 vs. mês anterior",
    tempoIA: "9s", tempoHumano: "3min 45s",
    conversaoCount: 245, conversaoTotal: 598, conversaoPct: 41,
    chamados: 24,
    chartLabel: "Conversas por semana",
    chart: [
      { label: "Sem 1", ia: 790, humano: 230 }, { label: "Sem 2", ia: 845, humano: 245 },
      { label: "Sem 3", ia: 812, humano: 238 }, { label: "Sem 4", ia: 900, humano: 260 },
    ],
  },
};

const initialConversations = [
  {
    id: "carlos", nome: "Carlos Eduardo Ramos", telefone: "+55 11 98877-2201",
    categoria: "Suporte", status: "humano", resolved: true,
    ultimaMsg: "Perfeito, muito obrigado!", horario: "14:32",
    tags: ["Unimed", "Cliente há 2 anos", "VIP"],
    historico: [
      { data: "12/05", desc: "Consulta Cardiologia" },
      { data: "08/06", desc: "Exame de sangue" },
      { data: "20/03", desc: "Consulta Retorno" },
    ],
    chamados: [{ numero: "#1042", status: "Resolvido", desc: "Atraso na entrega de resultado de exame", prioridade: "Alta" }],
    messages: [
      { id: "c1", autor: "cliente", texto: "Oi, boa tarde. Fiz um exame de sangue semana passada e até agora não recebi o resultado.", hora: "14:10" },
      { id: "c2", autor: "ia", texto: "Boa tarde, Carlos! Vou verificar o status do seu exame agora mesmo. Só um instante 🙏", hora: "14:10" },
      { id: "c3", autor: "ia", texto: "Encontrei aqui: seu exame está em análise no laboratório e a previsão de entrega é até amanhã (dia 15). Posso te avisar assim que sair?", hora: "14:11" },
      { id: "c4", autor: "cliente", texto: "Pode ser, mas já é a segunda vez que atrasa. Queria falar com alguém sobre isso.", hora: "14:12" },
      { id: "c5", autor: "sistema", texto: "Conversa transferida para Fernanda Souza (atendente)", hora: "14:13" },
      { id: "c6", autor: "humano", texto: "Oi Carlos, aqui é a Fernanda! Peço desculpas pelo atraso. Já abri um chamado com o laboratório pra priorizar seu caso, ok?", hora: "14:20" },
      { id: "c7", autor: "cliente", texto: "Ok, obrigado por resolver", hora: "14:25" },
      { id: "c8", autor: "humano", texto: "Imagina! Assim que tiver novidade te aviso por aqui. Qualquer coisa é só chamar 😊", hora: "14:30" },
      { id: "c9", autor: "cliente", texto: "Perfeito, muito obrigado!", hora: "14:32" },
    ],
  },
  {
    id: "maria", nome: "Maria Fernanda Souza", telefone: "+55 11 97711-4432",
    categoria: "Vendas", status: "ia", resolved: false,
    ultimaMsg: "Tenho horário na terça às 10h ou quinta às 15h. Qual prefere?", horario: "14:28",
    tags: ["Unimed", "Novo cliente"],
    historico: [{ data: "—", desc: "Primeiro contato" }],
    chamados: [],
    messages: [
      { id: "m1", autor: "cliente", texto: "Oi, boa tarde! Quanto custa a consulta com o Dr. Ricardo (cardiologista)?", hora: "14:20" },
      { id: "m2", autor: "ia", texto: "Boa tarde, Maria! A consulta com o Dr. Ricardo custa R$ 280, ou é coberta pelo convênio Unimed e Bradesco Saúde. Quer que eu já verifique horários disponíveis?", hora: "14:20" },
      { id: "m3", autor: "cliente", texto: "Quero sim, pode ser semana que vem", hora: "14:28" },
      { id: "m4", autor: "ia", texto: "Show! Tenho horário na terça às 10h ou quinta às 15h. Qual prefere?", hora: "14:28" },
    ],
  },
  {
    id: "joao", nome: "João Pedro Lima", telefone: "+55 11 96622-8890",
    categoria: "Suporte", status: "pendente", resolved: false,
    ultimaMsg: "Isso já é a segunda vez que atrasa, quero falar com uma pessoa.", horario: "14:13",
    tags: ["SulAmérica", "Cliente há 8 meses"],
    historico: [
      { data: "08/06", desc: "Exame de sangue" },
      { data: "15/04", desc: "Consulta Clínico Geral" },
    ],
    chamados: [{ numero: "#1041", status: "Em análise", desc: "Atraso na segunda via de exame", prioridade: "Alta" }],
    messages: [
      { id: "j1", autor: "cliente", texto: "Meu exame ainda não chegou, pode verificar?", hora: "14:10" },
      { id: "j2", autor: "ia", texto: "Claro, vou consultar agora.", hora: "14:10" },
      { id: "j3", autor: "ia", texto: "Encontrei: exame em análise no laboratório, previsão até amanhã.", hora: "14:11" },
      { id: "j4", autor: "cliente", texto: "Isso já é a segunda vez que atrasa, quero falar com uma pessoa.", hora: "14:13" },
    ],
  },
  {
    id: "ana", nome: "Ana Beatriz Costa", telefone: "+55 11 95544-1123",
    categoria: "Vendas", status: "ia", resolved: false,
    ultimaMsg: "Carteirinha válida ✅ Posso agendar sua consulta, é isso mesmo?", horario: "13:58",
    tags: ["Unimed"],
    historico: [{ data: "22/03", desc: "Consulta Ginecologia" }],
    chamados: [],
    messages: [
      { id: "a1", autor: "cliente", texto: "Vocês atendem pelo convênio Unimed?", hora: "13:55" },
      { id: "a2", autor: "ia", texto: "Atendemos sim! Unimed, Bradesco Saúde, SulAmérica e Amil. Quer que eu confira sua carteirinha?", hora: "13:56" },
      { id: "a3", autor: "cliente", texto: "Quero, número 123456789", hora: "13:58" },
      { id: "a4", autor: "ia", texto: "Carteirinha válida ✅ Posso agendar sua consulta, é isso mesmo?", hora: "13:58" },
    ],
  },
  {
    id: "juliana", nome: "Juliana Alves Martins", telefone: "+55 11 94433-7765",
    categoria: "Suporte", status: "pendente", resolved: false,
    ultimaMsg: "Nenhum desses funciona pra mim, queria falar com alguém.", horario: "13:40",
    tags: ["SulAmérica"],
    historico: [{ data: "10/06", desc: "Consulta Dermatologia" }],
    chamados: [{ numero: "#1043", status: "Em análise", desc: "Reagendamento fora dos horários padrão", prioridade: "Média" }],
    messages: [
      { id: "u1", autor: "cliente", texto: "Preciso remarcar meu horário de amanhã, pode ser?", hora: "13:35" },
      { id: "u2", autor: "ia", texto: "Consigo remarcar sim! Você tem horário livre na sexta às 9h ou na segunda às 14h.", hora: "13:36" },
      { id: "u3", autor: "cliente", texto: "Nenhum desses funciona pra mim, queria falar com alguém pra ver outras opções.", hora: "13:40" },
    ],
  },
  {
    id: "rafael", nome: "Rafael Henrique Dias", telefone: "+55 11 93322-6654",
    categoria: "Vendas", status: "humano", resolved: true,
    ultimaMsg: "Fechado, já fiz o pix", horario: "13:20",
    tags: ["Novo cliente", "Check-up"],
    historico: [],
    chamados: [],
    messages: [
      { id: "r1", autor: "cliente", texto: "Vi o anúncio de vocês no Instagram, queria fazer o check-up completo", hora: "13:05" },
      { id: "r2", autor: "ia", texto: "Que bom, Rafael! O check-up completo custa R$ 450 e inclui 6 exames + consulta. Quer fechar?", hora: "13:06" },
      { id: "r3", autor: "sistema", texto: "Conversa transferida para Fernanda Souza (atendente)", hora: "13:10" },
      { id: "r4", autor: "humano", texto: "Oi Rafael! Posso te enviar o link de pagamento pra garantir seu horário?", hora: "13:12" },
      { id: "r5", autor: "cliente", texto: "Pode sim", hora: "13:18" },
      { id: "r6", autor: "humano", texto: "Enviado! Assim que confirmar o pix eu já agendo pra você", hora: "13:19" },
      { id: "r7", autor: "cliente", texto: "Fechado, já fiz o pix", hora: "13:20" },
    ],
  },
];

const filterDefs = [
  { key: "todas", label: "Todas" },
  { key: "vendas", label: "Vendas" },
  { key: "suporte", label: "Suporte" },
  { key: "pendentes", label: "Pendentes" },
  { key: "humano", label: "Humano" },
];

/* ---------- Helpers ---------- */
function initialsOf(nome) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("");
}
function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/* ---------- Small components ---------- */
function NavItem({ icon: Icon, label, active, locked, badge, sprint, onClick }) {
  return (
    <button
      onClick={!locked ? onClick : undefined}
      disabled={locked}
      className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition"
      style={{
        backgroundColor: active ? "rgba(14,140,127,0.18)" : "transparent",
        color: locked ? "rgba(255,255,255,0.32)" : active ? tokens.tealLight : "rgba(255,255,255,0.78)",
        cursor: locked ? "not-allowed" : "pointer",
      }}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {locked && sprint && (
        <span className="text-xs flex items-center gap-1" style={{ fontFamily: fonts.mono, color: "rgba(255,255,255,0.32)" }}>
          <Lock size={11} />{sprint}
        </span>
      )}
      {badge ? (
        <span className="text-xs rounded-full px-1.5 py-0.5" style={{ backgroundColor: tokens.coral, color: "#fff", fontFamily: fonts.mono }}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function StatusPill({ status, resolved }) {
  const meta = statusMeta[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.color, fontFamily: fonts.mono }}
    >
      {resolved && <CheckCircle2 size={11} />}
      {resolved ? "Encerrado" : meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, delta, accent }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.line}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>
          {label}
        </span>
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${accent}1A` }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-semibold" style={{ color: tokens.textPrimary, fontFamily: fonts.display }}>{value}</p>
      {delta && <span className="text-xs" style={{ color: tokens.teal, fontFamily: fonts.mono }}>{delta}</span>}
    </div>
  );
}

function IndicatorChip({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.line}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: accent }} />
        <span className="text-xs font-medium" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{label}</span>
      </div>
      <p className="text-xl font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: tokens.textSecondary }}>{sub}</p>}
    </div>
  );
}

function FlowBar({ segments }) {
  return (
    <div>
      <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: tokens.paper }}>
        {segments.map((s, i) => (
          <div key={i} title={`${s.label}: ${s.pct}%`} className="h-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-5 mt-3">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-sm" style={{ color: tokens.textPrimary }}>{s.label}</span>
            <span className="text-sm" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{s.count} · {s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversationItem({ conv, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="conv-item w-full text-left px-4 py-3 flex gap-3 items-start"
      style={{
        backgroundColor: active ? tokens.tealSoft : "transparent",
        borderLeft: active ? `3px solid ${tokens.teal}` : "3px solid transparent",
      }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold" style={{ backgroundColor: tokens.ink, color: "#fff", fontFamily: fonts.display }}>
        {initialsOf(conv.nome)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate" style={{ color: tokens.textPrimary }}>{conv.nome}</p>
          <span className="text-xs shrink-0" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{conv.horario}</span>
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: tokens.textSecondary }}>{conv.ultimaMsg}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusPill status={conv.status} resolved={conv.resolved} />
          <span className="text-xs" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{conv.categoria}</span>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg }) {
  if (msg.autor === "sistema") {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5" style={{ backgroundColor: tokens.paper, color: tokens.textSecondary, border: `1px solid ${tokens.line}`, fontFamily: fonts.mono }}>
          <ArrowLeftRight size={11} /> {msg.texto} · {msg.hora}
        </span>
      </div>
    );
  }
  if (msg.autor === "nota") {
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-md px-3 py-2 rounded-md text-xs flex gap-2" style={{ backgroundColor: "#FFF9E8", border: "1px dashed #D9A441", color: "#7A5A12" }}>
          <StickyNote size={13} className="mt-0.5 shrink-0" />
          <span><strong>Nota interna</strong> (não visível ao cliente) — {msg.texto}</span>
        </div>
      </div>
    );
  }
  const isCliente = msg.autor === "cliente";
  const bubbleStyle = isCliente
    ? { backgroundColor: "#fff", border: `1px solid ${tokens.line}`, color: tokens.textPrimary }
    : msg.autor === "ia"
    ? { backgroundColor: tokens.tealSoft, border: `1px solid ${tokens.teal}33`, color: "#0B5A50" }
    : { backgroundColor: tokens.amberSoft, border: `1px solid ${tokens.amber}55`, color: "#7A5510" };

  return (
    <div className={`flex ${isCliente ? "justify-start" : "justify-end"} mb-2.5`}>
      <div className="max-w-md">
        {!isCliente && (
          <div className="flex items-center gap-1 mb-1 justify-end">
            {msg.autor === "ia" && <Bot size={12} style={{ color: tokens.teal }} />}
            <span className="text-xs font-medium" style={{ color: msg.autor === "ia" ? tokens.teal : tokens.amber, fontFamily: fonts.mono }}>
              {msg.autor === "ia" ? "Assistente IA" : "Fernanda Souza"}
            </span>
          </div>
        )}
        <div className="px-3.5 py-2.5 rounded-lg text-sm leading-relaxed message-in" style={bubbleStyle}>
          {msg.texto}
        </div>
        <p className={`text-xs mt-1 ${isCliente ? "text-left" : "text-right"}`} style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>
          {msg.hora}
        </p>
      </div>
    </div>
  );
}

/* ---------- Main app ---------- */
export default function AICustomerHubPrototype() {
  const [view, setView] = useState("dashboard");
  const [range, setRange] = useState("hoje");
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState("joao");
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setDraft("");
    setShowNoteBox(false);
    setNoteText("");
  }, [selectedId]);

  const data = dashboardData[range];
  const segments = [
    { label: "Resolvido pela IA", count: data.ia, pct: data.iaPct, color: tokens.teal },
    { label: "Transferido p/ humano", count: data.humano, pct: data.humanoPct, color: tokens.amber },
    { label: "Pendente", count: data.pendente, pct: data.pendentePct, color: tokens.coral },
  ];

  const counts = {
    todas: conversations.length,
    vendas: conversations.filter((c) => c.categoria === "Vendas").length,
    suporte: conversations.filter((c) => c.categoria === "Suporte").length,
    pendentes: conversations.filter((c) => c.status === "pendente" && !c.resolved).length,
    humano: conversations.filter((c) => c.status === "humano").length,
  };

  const filtered = conversations
    .filter((c) => {
      if (filter === "vendas") return c.categoria === "Vendas";
      if (filter === "suporte") return c.categoria === "Suporte";
      if (filter === "pendentes") return c.status === "pendente" && !c.resolved;
      if (filter === "humano") return c.status === "humano";
      return true;
    })
    .filter((c) => search.trim() === "" || c.nome.toLowerCase().includes(search.toLowerCase()));

  const selected = conversations.find((c) => c.id === selectedId) || null;

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(null), 3200);
  }

  function handleTransfer(id, nome) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: "humano", messages: [...c.messages, { id: `m-${Date.now()}`, autor: "sistema", texto: "Conversa transferida para Fernanda Souza (atendente)", hora: nowTime() }] }
          : c
      )
    );
    showToast(`Você assumiu a conversa com ${nome}`);
  }

  function handleResolve(id, nome) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, resolved: true, messages: [...c.messages, { id: `m-${Date.now()}`, autor: "sistema", texto: "Atendimento encerrado por Fernanda Souza", hora: nowTime() }] }
          : c
      )
    );
    showToast(`Atendimento com ${nome} encerrado`);
  }

  function handleSend(id) {
    if (!draft.trim()) return;
    const texto = draft.trim();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, messages: [...c.messages, { id: `m-${Date.now()}`, autor: "humano", texto, hora: nowTime() }], ultimaMsg: texto, horario: nowTime() }
          : c
      )
    );
    setDraft("");
  }

  function handleAddNote(id) {
    if (!noteText.trim()) return;
    const texto = noteText.trim();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, messages: [...c.messages, { id: `m-${Date.now()}`, autor: "nota", texto, hora: nowTime() }] } : c
      )
    );
    setNoteText("");
    setShowNoteBox(false);
  }

  const pendingBadge = counts.pendentes > 0 ? counts.pendentes : null;

  return (
    <div className="h-screen w-full flex overflow-hidden" style={{ backgroundColor: tokens.paper, fontFamily: fonts.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #D6D9DE; border-radius: 999px; }
        .conv-item { transition: background-color 0.15s ease; cursor: pointer; }
        .conv-item:hover { background-color: #F4F5F7; }
        .nav-btn:hover { background-color: rgba(255,255,255,0.06); }
        .btn-primary {
          background-color: #0E8C7F; color: #fff; font-size: 13px; font-weight: 500;
          padding: 8px 14px; border-radius: 8px; display: inline-flex; align-items: center;
          gap: 6px; transition: background-color 0.15s ease, opacity 0.15s ease;
        }
        .btn-primary:hover:not(:disabled) { background-color: #0B7367; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-secondary {
          background-color: #fff; color: #1B1F27; border: 1px solid #E4E6EA; font-size: 13px;
          font-weight: 500; padding: 7px 12px; border-radius: 8px; display: inline-flex;
          align-items: center; gap: 6px; transition: background-color 0.15s ease, opacity 0.15s ease;
          cursor: pointer;
        }
        .btn-secondary:hover:not(:disabled) { background-color: #F4F5F7; }
        .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
        .range-btn { transition: background-color 0.15s ease, color 0.15s ease; cursor: pointer; }
        .filter-pill { transition: background-color 0.15s ease, color 0.15s ease; cursor: pointer; }
        @keyframes toastIn { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .toast-el { animation: toastIn 0.25s ease; }
        @keyframes msgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .message-in { animation: msgIn 0.2s ease; }
        button:focus-visible, input:focus-visible {
          outline: 2px solid #0E8C7F; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .toast-el, .message-in { animation: none; }
          * { transition: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-60 h-screen flex flex-col justify-between shrink-0 overflow-y-auto" style={{ backgroundColor: tokens.ink }}>
        <div>
          <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: tokens.teal }}>
                <Bot size={18} color="#fff" />
              </div>
              <p className="text-white font-semibold leading-tight" style={{ fontFamily: fonts.display, fontSize: 14 }}>AI Customer Hub</p>
            </div>
            <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.38)", fontFamily: fonts.mono }}>Empresa</p>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.88)" }}>Clínica Vitalis</p>
          </div>

          <nav className="px-3 py-4 space-y-1">
            <NavItem icon={LayoutDashboard} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
            <NavItem icon={Inbox} label="Inbox de atendimento" active={view === "inbox"} badge={pendingBadge} onClick={() => setView("inbox")} />
            <div className="pt-3 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="px-3 pb-2 text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)", fontFamily: fonts.mono }}>Próximos módulos</p>
              <NavItem icon={Users} label="CRM" locked sprint="Sprint 4" />
              <NavItem icon={Ticket} label="Chamados" locked sprint="Sprint 5" />
              <NavItem icon={Zap} label="Automações" locked sprint="Sprint 5" />
            </div>
          </nav>
        </div>

        <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: tokens.amber, color: tokens.ink, fontFamily: fonts.display }}>FS</div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">Fernanda Souza</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>Atendente</p>
          </div>
          <Settings size={16} className="ml-auto shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {view === "dashboard" ? (
          <>
            <header className="h-16 shrink-0 flex items-center justify-between px-6" style={{ backgroundColor: tokens.surface, borderBottom: `1px solid ${tokens.line}` }}>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>Visão geral</p>
                <p className="text-xs" style={{ color: tokens.textSecondary }}>Protótipo · Dashboard (Sprint 1) + Inbox (Sprint 2)</p>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
              <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>Clínica Vitalis</h1>
                  <p className="text-sm mt-1" style={{ color: tokens.textSecondary }}>Dados de {data.rangeLabel}</p>
                </div>
                <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.line}` }}>
                  {["hoje", "7dias", "30dias"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className="range-btn px-3 py-1.5 rounded-md text-sm"
                      style={{ backgroundColor: range === r ? tokens.ink : "transparent", color: range === r ? "#fff" : tokens.textSecondary, fontFamily: fonts.mono }}
                    >
                      {r === "hoje" ? "Hoje" : r === "7dias" ? "7 dias" : "30 dias"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <StatCard icon={MessageSquareText} label="Conversas recebidas" value={data.recebidas} delta={data.delta} accent={tokens.ink} />
                <StatCard icon={Bot} label="Resolvido pela IA" value={`${data.iaPct}%`} delta={`${data.ia} conversas`} accent={tokens.teal} />
                <StatCard icon={Users} label="Transferido p/ humano" value={data.humano} delta={`${data.humanoPct}% do total`} accent={tokens.amber} />
                <StatCard icon={TrendingUp} label="Leads gerados" value={data.leads} delta={data.leadsDelta} accent={tokens.ink} />
              </div>

              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.line}` }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-base font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>Fluxo de resolução</h2>
                  <span className="text-xs" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{data.recebidas} conversas no período</span>
                </div>
                <FlowBar segments={segments} />
              </div>

              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.line}` }}>
                <h2 className="text-base font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>{data.chartLabel}</h2>
                <div style={{ height: 260 }} className="mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart} barGap={4}>
                      <CartesianGrid vertical={false} stroke={tokens.line} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: tokens.textSecondary, fontFamily: fonts.mono }} axisLine={{ stroke: tokens.line }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: tokens.textSecondary, fontFamily: fonts.mono }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: tokens.ink, border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#fff" }} />
                      <Bar dataKey="ia" name="Resolvido pela IA" fill={tokens.teal} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="humano" name="Transferido p/ humano" fill={tokens.amber} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <IndicatorChip icon={CheckCircle2} label="Taxa resolução IA" value={`${data.iaPct}%`} sub={`${data.ia} de ${data.recebidas} conversas`} accent={tokens.teal} />
                <IndicatorChip icon={Clock} label="Tempo médio resposta" value={data.tempoIA} sub={`Humano: ${data.tempoHumano}`} accent={tokens.ink} />
                <IndicatorChip icon={TrendingUp} label="Conversão de leads" value={`${data.conversaoPct}%`} sub={`${data.conversaoCount} de ${data.conversaoTotal} leads`} accent={tokens.ink} />
                <IndicatorChip icon={Ticket} label="Chamados abertos" value={data.chamados} sub={data.chamados > 0 ? "aguardando retorno" : "nenhum pendente"} accent={tokens.coral} />
              </div>
            </main>
          </>
        ) : (
          <>
            <header className="h-16 shrink-0 flex items-center justify-between px-6" style={{ backgroundColor: tokens.surface, borderBottom: `1px solid ${tokens.line}` }}>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>Inbox de atendimento</p>
                <p className="text-xs" style={{ color: tokens.textSecondary }}>{filtered.length} conversas · {counts.pendentes} aguardando atendimento</p>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* Column 1 — conversation list */}
              <div className="w-80 shrink-0 flex flex-col overflow-hidden" style={{ backgroundColor: tokens.surface, borderRight: `1px solid ${tokens.line}` }}>
                <div className="p-4" style={{ borderBottom: `1px solid ${tokens.line}` }}>
                  <div className="relative">
                    <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: tokens.textSecondary }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="w-full pl-9 pr-3 py-2 rounded-md text-sm outline-none"
                      style={{ backgroundColor: tokens.paper, border: `1px solid ${tokens.line}` }}
                    />
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {filterDefs.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className="filter-pill px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: filter === f.key ? tokens.ink : tokens.paper, color: filter === f.key ? "#fff" : tokens.textSecondary, fontFamily: fonts.mono }}
                      >
                        {f.label} {counts[f.key]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-center mt-8 px-4" style={{ color: tokens.textSecondary }}>Nenhuma conversa encontrada</p>
                  ) : (
                    filtered.map((c) => (
                      <ConversationItem key={c.id} conv={c} active={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
                    ))
                  )}
                </div>
              </div>

              {/* Column 2 — conversation */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {selected && (
                  <>
                    <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3" style={{ backgroundColor: tokens.surface, borderBottom: `1px solid ${tokens.line}` }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ fontFamily: fonts.display, color: tokens.textPrimary }}>{selected.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{selected.telefone}</span>
                          <StatusPill status={selected.status} resolved={selected.resolved} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={selected.status === "humano" || selected.resolved}
                          onClick={() => handleTransfer(selected.id, selected.nome)}
                          className="btn-secondary"
                        >
                          <ArrowLeftRight size={14} /> Transferir
                        </button>
                        <button disabled={selected.resolved} onClick={() => handleResolve(selected.id, selected.nome)} className="btn-secondary">
                          <CheckCircle2 size={14} /> Encerrar
                        </button>
                        <button onClick={() => setShowNoteBox((s) => !s)} className="btn-secondary">
                          <StickyNote size={14} /> Nota
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                      {selected.messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
                    </div>

                    {showNoteBox && (
                      <div className="px-5 py-3 flex gap-2" style={{ borderTop: "1px solid #E8D6A8", backgroundColor: "#FFFBEF" }}>
                        <input
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(selected.id); }}
                          placeholder="Escrever nota interna (não visível ao cliente)..."
                          className="flex-1 px-3 py-2 rounded-md text-sm outline-none"
                          style={{ border: "1px solid #E8D6A8", backgroundColor: "#fff" }}
                        />
                        <button onClick={() => handleAddNote(selected.id)} className="btn-primary">Salvar</button>
                      </div>
                    )}

                    <div className="px-5 py-4 flex gap-2" style={{ backgroundColor: tokens.surface, borderTop: `1px solid ${tokens.line}` }}>
                      <input
                        disabled={selected.resolved}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSend(selected.id); }}
                        placeholder={selected.resolved ? "Atendimento encerrado" : "Digite uma mensagem..."}
                        className="flex-1 px-3.5 py-2.5 rounded-md text-sm outline-none"
                        style={{ backgroundColor: tokens.paper, border: `1px solid ${tokens.line}` }}
                      />
                      <button disabled={selected.resolved} onClick={() => handleSend(selected.id)} className="btn-primary">
                        <Send size={14} /> Enviar
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Column 3 — client profile */}
              {selected && (
                <div className="w-80 shrink-0 overflow-y-auto scrollbar-thin p-5" style={{ backgroundColor: tokens.surface, borderLeft: `1px solid ${tokens.line}` }}>
                  <div className="flex flex-col items-center text-center pb-4" style={{ borderBottom: `1px solid ${tokens.line}` }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold mb-2" style={{ backgroundColor: tokens.ink, color: "#fff", fontFamily: fonts.display }}>
                      {initialsOf(selected.nome)}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>{selected.nome}</p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>
                      <Phone size={11} />{selected.telefone}
                    </p>
                  </div>

                  <div className="py-4" style={{ borderBottom: `1px solid ${tokens.line}` }}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>
                      <Tag size={11} />Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.length ? (
                        selected.tags.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: tokens.paper, color: tokens.textPrimary }}>{t}</span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: tokens.textSecondary }}>Sem tags</span>
                      )}
                    </div>
                  </div>

                  <div className="py-4" style={{ borderBottom: `1px solid ${tokens.line}` }}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>
                      <ShoppingBag size={11} />Histórico
                    </p>
                    {selected.historico.length ? (
                      <ul className="space-y-2">
                        {selected.historico.map((h, i) => (
                          <li key={i} className="text-sm flex justify-between gap-2" style={{ color: tokens.textPrimary }}>
                            <span>{h.desc}</span>
                            <span className="text-xs shrink-0" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>{h.data}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs" style={{ color: tokens.textSecondary }}>Sem histórico ainda</span>
                    )}
                  </div>

                  <div className="py-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: tokens.textSecondary, fontFamily: fonts.mono }}>
                      <Ticket size={11} />Chamados
                    </p>
                    {selected.chamados.length ? (
                      <div className="space-y-2">
                        {selected.chamados.map((ch, i) => (
                          <div key={i} className="rounded-md p-2.5" style={{ backgroundColor: tokens.paper }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold" style={{ fontFamily: fonts.mono, color: tokens.textPrimary }}>{ch.numero}</span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: ch.status === "Resolvido" ? tokens.tealSoft : tokens.coralSoft, color: ch.status === "Resolvido" ? tokens.teal : tokens.coral, fontFamily: fonts.mono }}
                              >
                                {ch.status}
                              </span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: tokens.textPrimary }}>{ch.desc}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: tokens.textSecondary }}>Nenhum chamado aberto</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="toast-el" style={{ position: "fixed", top: 20, right: 20, zIndex: 50 }}>
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ backgroundColor: tokens.ink, color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
            <CheckCircle2 size={16} style={{ color: tokens.tealLight }} />
            <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
