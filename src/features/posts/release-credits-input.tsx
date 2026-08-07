import { CornerDownLeft } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { releaseCreditRoles } from "./release-presentation";

function normalizeRoleQuery(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function getCreditRoleSuggestions(value: string, cursorPosition: number) {
  const cursor = Math.max(0, Math.min(cursorPosition, value.length));
  const lineStart = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", cursor);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const line = value.slice(lineStart, lineEnd);
  const separatorOffset = line.lastIndexOf("|", Math.max(0, cursor - lineStart));

  if (separatorOffset === -1) {
    return [] as string[];
  }

  const query = normalizeRoleQuery(value.slice(lineStart + separatorOffset + 1, cursor));
  if ((releaseCreditRoles as readonly string[]).includes(query)) {
    return [] as string[];
  }
  return releaseCreditRoles.filter((role) => !query || role.includes(query));
}

export function applyCreditRole(value: string, cursorPosition: number, role: string) {
  const cursor = Math.max(0, Math.min(cursorPosition, value.length));
  const lineStart = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", cursor);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const line = value.slice(lineStart, lineEnd);
  const separatorOffset = line.lastIndexOf("|", Math.max(0, cursor - lineStart));

  if (separatorOffset === -1) {
    if (!line.trim()) {
      return { value, cursorPosition: cursor };
    }
    const suffix = ` | ${role}`;
    return {
      value: `${value.slice(0, lineEnd)}${suffix}${value.slice(lineEnd)}`,
      cursorPosition: lineEnd + suffix.length,
    };
  }

  const roleStart = lineStart + separatorOffset + 1;
  const nextValue = `${value.slice(0, roleStart)} ${role}${value.slice(lineEnd)}`;
  return {
    value: nextValue,
    cursorPosition: roleStart + role.length + 1,
  };
}

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

export function ReleaseCreditsInput({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsId = useId();
  const [cursorPosition, setCursorPosition] = useState(0);
  const [focused, setFocused] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestions = focused ? getCreditRoleSuggestions(value, cursorPosition) : [];
  const showSuggestions = suggestionsOpen && suggestions.length > 0;
  const activeSuggestionIndex = Math.min(activeSuggestion, Math.max(0, suggestions.length - 1));

  function selectRole(role: string) {
    const result = applyCreditRole(value, cursorPosition, role);
    onChange(result.value);
    setCursorPosition(result.cursorPosition);
    setSuggestionsOpen(false);
    setActiveSuggestion(0);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursorPosition, result.cursorPosition);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showSuggestions) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionsOpen(false);
      return;
    }

    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      selectRole(suggestions[activeSuggestionIndex]);
    }
  }

  return (
    <div className="grid gap-2">
      <div>
        <Textarea
          ref={textareaRef}
          value={value}
          aria-label="Credits"
          aria-invalid={Boolean(error)}
          aria-describedby="release-credit-role-help"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? suggestionsId : undefined}
          aria-expanded={showSuggestions}
          className={error ? "border-warning/50" : undefined}
          onBlur={() => {
            setFocused(false);
            setSuggestionsOpen(false);
          }}
          onFocus={(event) => {
            setFocused(true);
            setSuggestionsOpen(true);
            setCursorPosition(event.currentTarget.selectionStart);
          }}
          onClick={(event) => {
            setCursorPosition(event.currentTarget.selectionStart);
            setSuggestionsOpen(true);
            setActiveSuggestion(0);
          }}
          onKeyUp={(event) => setCursorPosition(event.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            setCursorPosition(event.currentTarget.selectionStart);
            setSuggestionsOpen(true);
            setActiveSuggestion(0);
          }}
          placeholder={"Ari Vega | producer\nMina Cole | mix_engineer"}
        />

        {showSuggestions ? (
          <div
            id={suggestionsId}
            role="listbox"
            aria-label="Matching credit roles"
            className="mt-2 overflow-hidden rounded-[16px] border border-white/10 bg-[rgba(17,13,30,0.72)] p-1.5 shadow-[0_14px_36px_rgba(4,2,12,0.2)]"
          >
            <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              <span>Credit role</span>
              <span>{suggestions.length} match{suggestions.length === 1 ? "" : "es"}</span>
            </div>
            <div className="max-h-52 overflow-y-auto overscroll-contain">
              {suggestions.map((role, index) => (
                <button
                  key={role}
                  type="button"
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[11px] px-3 py-2 text-left text-sm transition-colors",
                    index === activeSuggestionIndex
                      ? "bg-accent/14 text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.045] hover:text-foreground",
                  )}
                  onMouseEnter={() => setActiveSuggestion(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectRole(role)}
                >
                  <span className="capitalize">{formatRole(role)}</span>
                  {index === activeSuggestionIndex ? (
                    <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                      Enter <CornerDownLeft className="size-3" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div id="release-credit-role-help" className="text-xs text-muted-foreground">
        <span>Use </span>
        <span className="font-mono text-subtle-foreground">Name | role</span>
        <span>. Type after the separator to search available roles.</span>
      </div>
      {error ? <span role="alert" className="text-sm text-warning">{error}</span> : null}
    </div>
  );
}
