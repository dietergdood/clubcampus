import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModalOrSheet } from "../Modal.tsx";

/* Desktop-Pfad testen — useIsMobile liefert false. */
vi.mock("../hooks.ts", () => ({ useIsMobile: () => false }));

beforeEach(cleanup);

function backdrop() {
  const el = document.querySelector(".cc-modal-overlay");
  if (!el) throw new Error("Overlay nicht gefunden");
  return el;
}

describe("ModalOrSheet — Escape", () => {
  function escape() {
    fireEvent.keyDown(window, { key: "Escape" });
  }

  it("schliesst, solange nichts eingegeben wurde", () => {
    const onClose = vi.fn();
    render(<ModalOrSheet open onClose={onClose}><div>Nur Text</div></ModalOrSheet>);
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("schliesst NICHT, sobald getippt wurde", () => {
    const onClose = vi.fn();
    render(
      <ModalOrSheet open onClose={onClose}>
        <input aria-label="Vorname" defaultValue=""/>
      </ModalOrSheet>,
    );
    fireEvent.input(screen.getByLabelText("Vorname"), { target: { value: "Adrian" } });
    escape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reagiert nicht auf andere Tasten", () => {
    const onClose = vi.fn();
    render(<ModalOrSheet open onClose={onClose}><div>Text</div></ModalOrSheet>);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("bei zwei offenen Modalen schliesst nur das obere", () => {
    /* Modal im Modal: ohne Stapel gingen beide zu und die Eingabe im
       unteren wäre weg. */
    const unten = vi.fn();
    const oben  = vi.fn();
    render(
      <>
        <ModalOrSheet open onClose={unten}><div>Unten</div></ModalOrSheet>
        <ModalOrSheet open onClose={oben}><div>Oben</div></ModalOrSheet>
      </>,
    );
    escape();
    expect(oben).toHaveBeenCalledTimes(1);
    expect(unten).not.toHaveBeenCalled();
  });

  it("nach dem Schliessen des oberen reagiert wieder das untere", () => {
    const unten = vi.fn();
    const oben  = vi.fn();
    const { rerender } = render(
      <>
        <ModalOrSheet open onClose={unten}><div>Unten</div></ModalOrSheet>
        <ModalOrSheet open onClose={oben}><div>Oben</div></ModalOrSheet>
      </>,
    );
    rerender(
      <>
        <ModalOrSheet open onClose={unten}><div>Unten</div></ModalOrSheet>
        <ModalOrSheet open={false} onClose={oben}><div>Oben</div></ModalOrSheet>
      </>,
    );
    escape();
    expect(unten).toHaveBeenCalledTimes(1);
  });
});

describe("ModalOrSheet — Klick neben das Modal", () => {
  it("schliesst, solange nichts eingegeben wurde", () => {
    const onClose = vi.fn();
    render(<ModalOrSheet open onClose={onClose}><div>Nur Text</div></ModalOrSheet>);
    fireEvent.click(backdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("schliesst NICHT, sobald im Modal getippt wurde", () => {
    /* Der eigentliche Fehler: ein halb ausgefülltes Formular ging bei
       einem Fehlklick neben das Modal vollständig verloren. */
    const onClose = vi.fn();
    render(
      <ModalOrSheet open onClose={onClose}>
        <input aria-label="Vorname" defaultValue=""/>
      </ModalOrSheet>,
    );
    fireEvent.input(screen.getByLabelText("Vorname"), { target: { value: "Adrian" } });
    fireEvent.click(backdrop());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("schliesst NICHT nach einer Auswahl im Ausklappfeld", () => {
    const onClose = vi.fn();
    render(
      <ModalOrSheet open onClose={onClose}>
        <select aria-label="Typ" defaultValue="">
          <option value="">—</option>
          <option value="a">A</option>
        </select>
      </ModalOrSheet>,
    );
    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "a" } });
    fireEvent.click(backdrop());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ein Klick INS Modal schliesst ohnehin nie", () => {
    const onClose = vi.fn();
    render(<ModalOrSheet open onClose={onClose}><div>Inhalt</div></ModalOrSheet>);
    fireEvent.click(screen.getByText("Inhalt"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("immerSchliessbar hebt die Sperre auf", () => {
    const onClose = vi.fn();
    render(
      <ModalOrSheet open onClose={onClose} immerSchliessbar>
        <input aria-label="Suche" defaultValue=""/>
      </ModalOrSheet>,
    );
    fireEvent.input(screen.getByLabelText("Suche"), { target: { value: "x" } });
    fireEvent.click(backdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("vergisst frühere Eingaben beim erneuten Öffnen", () => {
    /* Dieselbe Instanz wird für den nächsten Datensatz wiederverwendet —
       sonst bliebe das Modal für den Rest der Sitzung gesperrt. */
    const onClose = vi.fn();
    const { rerender } = render(
      <ModalOrSheet open onClose={onClose}>
        <input aria-label="Vorname" defaultValue=""/>
      </ModalOrSheet>,
    );
    fireEvent.input(screen.getByLabelText("Vorname"), { target: { value: "Adrian" } });
    rerender(<ModalOrSheet open={false} onClose={onClose}><div/></ModalOrSheet>);
    rerender(
      <ModalOrSheet open onClose={onClose}>
        <input aria-label="Vorname" defaultValue=""/>
      </ModalOrSheet>,
    );
    fireEvent.click(backdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
