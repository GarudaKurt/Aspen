"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { billingDateLabel, money } from "../mappers";
import { invoiceNumber, outstanding } from "../invoice";
import { receiptMethod, receiptSchema, validReceiptFile } from "../schemas";
import { methodLabels, type Invoice, type Method } from "../types";

type ReceiptMethod = (typeof receiptMethod.options)[number];
type Props = {
  invoice: Invoice;
  preferred: Method | null;
  today: string;
  instructions: Record<ReceiptMethod, string>;
  pending: boolean;
};

export function PaymentProofSheet({
  invoice,
  preferred,
  today,
  instructions,
  pending,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <div>
      <Button
        ref={trigger}
        type="button"
        disabled={pending || submitted}
        onClick={() => setOpen(true)}
      >
        Submit Proof of Payment
      </Button>
      {(submitted || pending) && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          {submitted ? "Receipt submitted. " : ""}Pending verification. You can
          view the receipt in Payment history.
        </p>
      )}
      {open && (
        <ProofForm
          invoice={invoice}
          preferred={preferred}
          instructions={instructions}
          today={today}
          close={close}
          complete={() => {
            setSubmitted(true);
            close();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ProofForm({
  invoice,
  preferred,
  today,
  instructions,
  close,
  complete,
}: Omit<Props, "pending"> & { close: () => void; complete: () => void }) {
  const balance = outstanding(invoice);
  const [method, setMethod] = useState<ReceiptMethod>(
    receiptMethod.safeParse(preferred).data ?? "bank",
  );
  const [reference, setReference] = useState("");
  const [paid, setPaid] = useState(today);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [selection,setSelection]=useState<{file:File;url:string}|null>(null);
  const file=selection?.file, preview=selection?.url;
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  const busy = progress !== null;
  const fields = {
    invoice: invoice.id,
    due: invoice.due_on,
    method,
    reference,
    paid,
    amount,
  };
  const valid =
    receiptSchema.safeParse(fields).success &&
    paid <= today &&
    Number(amount) <= balance &&
    !!file;
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => {
    const dialog = form.current?.closest('[role="dialog"]');
    const radio =
      form.current?.querySelector<HTMLInputElement>("input:checked");
    radio?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !inFlight.current) {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const elements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:enabled,a[href],input:enabled:not([hidden])",
        ),
      ).filter((el) => el.getClientRects().length);
      const first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [close]);
  function choose(files: FileList | null) {
    if (!files?.length || inFlight.current) return;
    if (files.length !== 1 || !validReceiptFile(files[0])) {
      setSelection(null);
      setError("Choose one JPG, PNG, WebP or PDF receipt up to 3 MiB.");
      return;
    }
    setError("");
    setSelection({file:files[0],url:URL.createObjectURL(files[0])});
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || !file || inFlight.current) return;
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    data.set("proof", file);
    inFlight.current = true;
    setError("");
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/billing/proofs");
    xhr.responseType = "json";
    xhr.timeout = 90000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded * 100) / e.total));
    };
    const fail = () => {
      inFlight.current = false;
      setProgress(null);
      setError(
        xhr.response?.message ??
          "Check Payment history before retrying. The receipt may have reached Aspen.",
      );
    };
    xhr.onerror = xhr.ontimeout = xhr.onabort = fail;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.ok) {
        inFlight.current = false;
        complete();
      } else fail();
    };
    xhr.send(data);
  }
  const cancel = () => {
    if (!inFlight.current) close();
  };
  return (
    <Sheet open onOpenChange={cancel} label="Submit proof of payment">
      <SheetContent title="Submit proof of payment" onClose={cancel}>
        <form ref={form} onSubmit={submit} className="space-y-5 p-5">
          <section className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
            <strong>
              {invoiceNumber(invoice)} · {invoice.plan}
            </strong>
            <p>
              {billingDateLabel(invoice.period_start)} –{" "}
              {billingDateLabel(invoice.period_end)}
            </p>
            <p>
              Invoice total {money(invoice.amount_php)} · Outstanding{" "}
              <strong>{money(balance)}</strong>
            </p>
          </section>
          <fieldset disabled={busy} className="grid gap-4">
            <fieldset>
              <legend className="mb-2 font-medium">Payment method</legend>
              <div className="grid grid-cols-2 gap-2">
                {receiptMethod.options.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="method"
                      value={value}
                      checked={method === value}
                      onChange={() => setMethod(value)}
                    />
                    {methodLabels[value]}
                  </label>
                ))}
              </div>
            </fieldset>
            {instructions[method] && (
              <p className="whitespace-pre-line text-sm text-slate-600">
                {instructions[method]}
              </p>
            )}
            <label>
              Reference number{method === "cash" ? " (optional)" : ""}
              <Input
                value={reference}
                required={method !== "cash"}
                minLength={3}
                maxLength={100}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Payment date
                <Input
                  type="date"
                  required
                  max={today}
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                />
              </label>
              <label>
                Amount paid (PHP)
                <Input
                  type="number"
                  inputMode="decimal"
                  required
                  min="0.01"
                  max={balance}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>
            <div
              className={`space-y-2 rounded-lg border border-dashed p-4 ${dragging ? "bg-emerald-50" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choose(e.dataTransfer.files);
              }}
            >
              <p className="font-medium">Proof of payment</p>
              <p className="text-sm text-slate-600">
                Drop one JPG, PNG, WebP or PDF here, up to 3 MiB.
              </p>
              <input
                ref={input}
                type="file"
                hidden
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => {
                  choose(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => input.current?.click()}
              >
                {file ? "Replace file" : "Choose file"}
              </Button>
              {file && (
                <div className="space-y-2">
                  <p className="break-all text-sm">{file.name}</p>
                  {preview &&
                    (file.type === "application/pdf" ? (
                      <a
                        className="text-sm underline"
                        href={preview}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Preview PDF in a new tab
                      </a>
                    ) : (
                      <Image
                        src={preview}
                        alt="Selected payment receipt"
                        unoptimized
                        width={320}
                        height={220}
                        className="max-h-44 w-full object-contain"
                      />
                    ))}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelection(null)}
                  >
                    Remove file
                  </Button>
                </div>
              )}
            </div>
          </fieldset>
          {busy && (
            <div role="status" className="text-sm">
              <progress className="w-full" value={progress ?? 0} max={100} />
              {progress === 100
                ? "Saving receipt…"
                : `Uploading · ${progress}%`}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={cancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              Submit receipt
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
