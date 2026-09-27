"use client";
// Peças de interface compartilhadas. Toda tela usa estas — nenhuma cor escrita direto nas páginas.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Erros } from "@/lib/regras";

// ------------------------------------------------------------------ botões

type VarianteBotao = "primario" | "secundario" | "perigo" | "fantasma";

const VARIANTES: Record<VarianteBotao, string> = {
  primario: "bg-marca text-white hover:bg-marca-forte",
  secundario: "border border-borda bg-superficie text-texto hover:bg-fundo",
  perigo: "bg-perigo text-white hover:brightness-95",
  fantasma: "text-marca hover:bg-marca-clara",
};

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
    />
  );
}

// ------------------------------------------------------------------ campos

const estiloCampo =
  "w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm text-texto placeholder:text-suave/70 aria-[invalid=true]:border-perigo";

interface BaseCampo {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  obrigatorio?: boolean;
}

function Moldura({ id, rotulo, erro, ajuda, obrigatorio, children }: BaseCampo & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {rotulo}
        {obrigatorio && <span className="text-perigo" aria-hidden> *</span>}
      </label>
      {children}
      {ajuda && !erro && <p id={`${id}-ajuda`} className="text-xs text-suave">{ajuda}</p>}
      {erro && <p id={`${id}-erro`} className="text-xs font-medium text-perigo" role="alert">{erro}</p>}
    </div>
  );
}

function ariaDe(id: string, erro?: string, ajuda?: string) {
  return {
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined,
  };
}

export function Campo({ rotulo, erro, ajuda, obrigatorio, ...props }: BaseCampo & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} obrigatorio={obrigatorio}>
      <input id={id} required={obrigatorio} {...ariaDe(id, erro, ajuda)} {...props} className={estiloCampo} />
    </Moldura>
  );
}

export function AreaTexto({ rotulo, erro, ajuda, obrigatorio, ...props }: BaseCampo & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} obrigatorio={obrigatorio}>
      <textarea id={id} rows={3} {...ariaDe(id, erro, ajuda)} {...props} className={estiloCampo} />
    </Moldura>
  );
}

export function Selecao({
  rotulo, erro, ajuda, obrigatorio, opcoes, vazio, ...props
}: BaseCampo & React.SelectHTMLAttributes<HTMLSelectElement> & { opcoes: { valor: string; texto: string }[]; vazio?: string }) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} obrigatorio={obrigatorio}>
      <select id={id} required={obrigatorio} {...ariaDe(id, erro, ajuda)} {...props} className={estiloCampo}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </Moldura>
  );
}

export function Marcar({ rotulo, ajuda, ...props }: { rotulo: string; ajuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" {...props} className="mt-1 size-4 accent-marca" />
      <label htmlFor={id} className="text-sm">
        {rotulo}
        {ajuda && <span className="block text-xs text-suave">{ajuda}</span>}
      </label>
    </div>
  );
}

// ------------------------------------------------------------------ estrutura

export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-titulo text-3xl text-marca-forte">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-borda bg-superficie p-4 ${className}`}>{children}</section>;
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borda bg-superficie/60 px-6 py-10 text-center">
      <p className="font-medium text-texto">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-suave">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

const TONS = {
  neutro: "bg-fundo text-suave border-borda",
  marca: "bg-marca-clara text-marca-forte border-marca/20",
  folha: "bg-folha-clara text-folha-forte border-folha/30",
  alerta: "bg-alerta-claro text-alerta border-alerta/30",
  perigo: "bg-perigo-claro text-perigo border-perigo/30",
};

export type Tom = keyof typeof TONS;

export function Etiqueta({ tom = "neutro", children }: { tom?: Tom; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONS[tom]}`}>{children}</span>;
}

export function Aviso({ tom = "alerta", titulo, children }: { tom?: Tom; titulo?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${TONS[tom]}`} role="note">
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div className="text-texto/80">{children}</div>
    </div>
  );
}

export function Filtro({ valor, onChange, rotulo = "Buscar" }: { valor: string; onChange: (v: string) => void; rotulo?: string }) {
  return (
    <input
      type="search"
      aria-label={rotulo}
      placeholder={rotulo + "…"}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className={`${estiloCampo} sm:max-w-xs`}
    />
  );
}

// ------------------------------------------------------------------ modal

export function Modal({ aberto, titulo, onFechar, children, largo }: { aberto: boolean; titulo: string; onFechar: () => void; children: React.ReactNode; largo?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      aria-label={titulo}
      className={`m-auto w-[calc(100%-2rem)] ${largo ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-borda bg-superficie p-0 text-texto shadow-xl backdrop:bg-black/40`}
    >
      {aberto && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-borda px-5 py-3">
            <h2 className="font-titulo text-xl text-marca-forte">{titulo}</h2>
            <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-md p-1 text-suave hover:bg-fundo">
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Rodapé padrão de formulário dentro de modal. */
export function RodapeForm({ onCancelar, rotulo = "Salvar", desabilitado }: { onCancelar: () => void; rotulo?: string; desabilitado?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
      <Botao type="submit" disabled={desabilitado}>{rotulo}</Botao>
    </div>
  );
}

// ------------------------------------------------------------------ confirmação e avisos (toast)

type Confirmacao = { titulo: string; texto: string; rotulo: string; perigo?: boolean; resolver: (v: boolean) => void };
type Toast = { id: number; texto: string; tom: "ok" | "erro" };

const CtxUi = createContext<{
  confirmar: (o: Omit<Confirmacao, "resolver">) => Promise<boolean>;
  avisar: (texto: string, tom?: "ok" | "erro") => void;
} | null>(null);

export function ProvedorUi({ children }: { children: React.ReactNode }) {
  const [conf, setConf] = useState<Confirmacao | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirmar = useCallback(
    (o: Omit<Confirmacao, "resolver">) => new Promise<boolean>((resolver) => setConf({ ...o, resolver })),
    [],
  );
  const avisar = useCallback((texto: string, tom: "ok" | "erro" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, texto, tom }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tom === "erro" ? 7000 : 3500);
  }, []);

  const fechar = (v: boolean) => {
    conf?.resolver(v);
    setConf(null);
  };

  return (
    <CtxUi.Provider value={{ confirmar, avisar }}>
      {children}
      <Modal aberto={!!conf} titulo={conf?.titulo ?? ""} onFechar={() => fechar(false)}>
        <p className="text-sm text-texto/80">{conf?.texto}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => fechar(false)}>Voltar</Botao>
          <Botao variante={conf?.perigo ? "perigo" : "primario"} onClick={() => fechar(true)}>{conf?.rotulo}</Botao>
        </div>
      </Modal>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md rounded-lg px-4 py-2 text-sm shadow-lg ${t.tom === "erro" ? "bg-perigo text-white" : "bg-marca-forte text-white"}`}
          >
            {t.texto}
          </div>
        ))}
      </div>
    </CtxUi.Provider>
  );
}

export function useUi() {
  const c = useContext(CtxUi);
  if (!c) throw new Error("useUi fora do ProvedorUi");
  return c;
}

/** Estado de formulário + erros por campo + envio de ação com aviso. */
export function useFormulario<T>(inicial: T) {
  const [dados, setDados] = useState<T>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const campo = <K extends keyof T>(k: K) => (v: T[K]) => setDados((d) => ({ ...d, [k]: v }));
  const reiniciar = (v: T) => {
    setDados(v);
    setErros({});
  };
  return { dados, setDados, erros, setErros, campo, reiniciar };
}
