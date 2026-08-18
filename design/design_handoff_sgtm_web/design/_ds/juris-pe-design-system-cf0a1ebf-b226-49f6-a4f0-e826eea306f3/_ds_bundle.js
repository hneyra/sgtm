/* @ds-bundle: {"format":3,"namespace":"JurisPEDesignSystem_cf0a1e","components":[{"name":"CitationRef","sourcePath":"components/brand/CitationRef.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Chip","sourcePath":"components/display/Chip.jsx"},{"name":"SourceChip","sourcePath":"components/display/SourceChip.jsx"},{"name":"Stat","sourcePath":"components/display/Stat.jsx"},{"name":"Tabs","sourcePath":"components/display/Tabs.jsx"},{"name":"ResultCard","sourcePath":"components/legal/ResultCard.jsx"},{"name":"SearchBar","sourcePath":"components/legal/SearchBar.jsx"},{"name":"SynthesisCallout","sourcePath":"components/legal/SynthesisCallout.jsx"}],"sourceHashes":{"components/brand/CitationRef.jsx":"56108f9d8a15","components/brand/Logo.jsx":"92e486c74bd7","components/core/Button.jsx":"2f6759ccd7dc","components/core/Checkbox.jsx":"795d4797611a","components/core/IconButton.jsx":"ab30d32d2edd","components/core/Input.jsx":"bbf569342de9","components/core/Switch.jsx":"0e567d5f03c0","components/display/Badge.jsx":"9ce9373f0a07","components/display/Chip.jsx":"ac01bfb7186c","components/display/SourceChip.jsx":"3473964e3f7d","components/display/Stat.jsx":"fd381527e8f3","components/display/Tabs.jsx":"528a8e2a8668","components/legal/ResultCard.jsx":"44ac4d35e05e","components/legal/SearchBar.jsx":"b0648c1b259f","components/legal/SynthesisCallout.jsx":"7126ca27b1e3","ui_kits/juris-web/app.jsx":"c26d80dd945c","ui_kits/juris-web/chrome.jsx":"b2d64756f7cd","ui_kits/juris-web/kit-data.js":"5c54790d817f","ui_kits/juris-web/landing.jsx":"101086973c7c","ui_kits/juris-web/results.jsx":"1776ad44afba","ui_kits/juris-web/sentence.jsx":"a91118921ae0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.JurisPEDesignSystem_cf0a1e = window.JurisPEDesignSystem_cf0a1e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/CitationRef.jsx
try { (() => {
/**
 * CitationRef — the trust primitive of Juris PE. Two shapes:
 *  · variant="marker" — a clickable [N] superscript inside synthesized text
 *  · variant="ref"    — a monospaced reference pill (STC 04780-2017-PHC/TC)
 * The marker carries `active` state when its source is selected.
 */
function CitationRef({
  variant = "ref",
  n,
  active = false,
  onClick,
  style = {},
  children
}) {
  if (variant === "marker") {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        margin: "0 2px",
        background: active ? "var(--accent)" : "var(--accent-soft)",
        color: active ? "#fff" : "var(--accent-ink)",
        fontWeight: 600,
        fontSize: 11,
        fontFamily: "var(--font-sans)",
        borderRadius: 4,
        border: 0,
        cursor: "pointer",
        verticalAlign: "baseline",
        transition: "all .15s",
        ...style
      }
    }, n);
  }
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "0.92em",
      fontWeight: 600,
      color: "var(--accent)",
      background: "var(--accent-soft)",
      padding: "1px 6px",
      borderRadius: 3,
      cursor: onClick ? "pointer" : "default",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { CitationRef });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/CitationRef.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
/**
 * Logo — Juris PE brand mark + wordmark. The mark is a navy rounded square
 * holding a "scales/J" glyph; the wordmark sets "Juris·PE" in the serif voice.
 * `mark` renders the glyph only.
 */
function Logo({
  size = 22,
  mark = false,
  accent = "var(--accent)",
  style = {}
}) {
  const Glyph = /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "28",
    height: "28",
    rx: "4",
    fill: accent
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 8v12.5a3.5 3.5 0 0 1-7 0",
    stroke: "#fff",
    strokeWidth: "2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "8",
    r: "1.5",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "22",
    cy: "13",
    r: "1.2",
    fill: "#fff",
    opacity: "0.6"
  }));
  if (mark) return Glyph;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      ...style
    }
  }, Glyph, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: size * 0.82,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1,
      color: "var(--ink)"
    }
  }, "Juris", /*#__PURE__*/React.createElement("span", {
    style: {
      color: accent
    }
  }, "\xB7"), "PE"));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — the primary action element across Juris PE.
 * Editorial, restrained: 6px radius, Inter 500, soft hover.
 */
function Button({
  variant = "secondary",
  // primary | secondary | ghost
  size = "md",
  // sm | md | lg
  iconLeft = null,
  iconRight = null,
  disabled = false,
  style = {},
  children,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "6px 10px",
      fontSize: 12,
      radius: "var(--r-1)"
    },
    md: {
      padding: "10px 16px",
      fontSize: 13,
      radius: "var(--r-2)"
    },
    lg: {
      padding: "14px 22px",
      fontSize: 14,
      radius: "var(--r-2)"
    }
  };
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "#fff",
      border: "1px solid var(--accent)"
    },
    secondary: {
      background: "var(--bg-elev)",
      color: "var(--ink)",
      border: "1px solid var(--line-2)"
    },
    ghost: {
      background: "transparent",
      color: "var(--ink)",
      border: "1px solid transparent"
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.secondary;
  const hover = (e, on) => {
    if (disabled) return;
    if (variant === "primary") e.currentTarget.style.background = on ? "var(--accent-2)" : "var(--accent)";else if (variant === "ghost") e.currentTarget.style.background = on ? "var(--accent-soft)" : "transparent";else e.currentTarget.style.borderColor = on ? "var(--ink-3)" : "var(--line-2)";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: e => hover(e, true),
    onMouseLeave: e => hover(e, false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: s.padding,
      fontSize: s.fontSize,
      fontWeight: 500,
      fontFamily: "var(--font-sans)",
      borderRadius: s.radius,
      whiteSpace: "nowrap",
      transition: "all .15s ease",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...v,
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Checkbox.jsx
try { (() => {
/**
 * Checkbox — custom navy check used throughout filter panels.
 * Controlled: pass `checked` + `onChange`.
 */
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontSize: 13,
      padding: "4px 0",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      flexShrink: 0,
      borderRadius: 3,
      border: `1.5px solid ${checked ? "var(--accent)" : "var(--line-2)"}`,
      background: checked ? "var(--accent)" : "transparent",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all .12s ease"
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "11",
    height: "11",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 12l5 5L20 6"
  }))), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      display: "none"
    }
  }), label && /*#__PURE__*/React.createElement("span", {
    style: {
      color: checked ? "var(--ink)" : "var(--ink-2)"
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — a square, icon-only control for toolbars and dense action rows.
 */
function IconButton({
  variant = "ghost",
  // ghost | solid | outline
  size = "md",
  // sm | md
  label,
  // accessible label (title + aria-label)
  disabled = false,
  style = {},
  children,
  ...rest
}) {
  const dim = size === "sm" ? 28 : 34;
  const variants = {
    ghost: {
      background: "transparent",
      color: "var(--ink-2)",
      border: "1px solid transparent"
    },
    solid: {
      background: "var(--accent)",
      color: "#fff",
      border: "1px solid var(--accent)"
    },
    outline: {
      background: "var(--bg-elev)",
      color: "var(--ink-2)",
      border: "1px solid var(--line-2)"
    }
  };
  const v = variants[variant] || variants.ghost;
  const hover = (e, on) => {
    if (disabled) return;
    if (variant === "solid") e.currentTarget.style.background = on ? "var(--accent-2)" : "var(--accent)";else e.currentTarget.style.background = on ? "var(--accent-soft)" : variant === "outline" ? "var(--bg-elev)" : "transparent";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    title: label,
    "aria-label": label,
    disabled: disabled,
    onMouseEnter: e => hover(e, true),
    onMouseLeave: e => hover(e, false),
    style: {
      width: dim,
      height: dim,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--r-2)",
      transition: "all .15s ease",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...v,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with optional leading icon. Cream fill, navy focus ring.
 * Used for filters, modals and forms. For the hero/search field use SearchBar.
 */
function Input({
  iconLeft = null,
  size = "md",
  // sm | md | lg
  serif = false,
  // use serif for query-like fields
  invalid = false,
  style = {},
  wrapperStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const pad = {
    sm: "7px 10px",
    md: "10px 12px",
    lg: "14px 16px"
  }[size] || "10px 12px";
  const fs = {
    sm: 13,
    md: 14,
    lg: 16
  }[size] || 14;
  const borderColor = invalid ? "var(--crimson)" : focused ? "var(--accent)" : "var(--line-2)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--bg-elev)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--r-2)",
      padding: pad,
      boxShadow: focused && !invalid ? "var(--ring)" : "none",
      transition: "border-color .15s, box-shadow .15s",
      ...wrapperStyle
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-3)",
      display: "inline-flex",
      flexShrink: 0
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: e => {
      setFocused(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur && rest.onBlur(e);
    }
  }, rest, {
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: "none",
      background: "transparent",
      fontSize: fs,
      color: "var(--ink)",
      fontFamily: serif ? "var(--font-serif)" : "var(--font-sans)",
      ...style
    }
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
/**
 * Switch — pill toggle for settings (notifications, quiet hours…).
 * Controlled: pass `checked` + `onChange`.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 36,
      height: 20,
      padding: 2,
      flexShrink: 0,
      background: checked ? "var(--accent)" : "var(--line-2)",
      border: 0,
      borderRadius: 999,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background .15s",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      width: 16,
      height: 16,
      background: "#fff",
      borderRadius: "50%",
      transform: checked ? "translateX(16px)" : "translateX(0)",
      transition: "transform .15s",
      boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
/**
 * Badge — status pill for case states and rulings. Tone drives the semantic
 * color: `neutral`, `ok` (FUNDADA / firme / verified), `bad` (INFUNDADA),
 * `accent` (navy), `solid` (filled navy for counts/new).
 */
function Badge({
  tone = "neutral",
  dot = false,
  style = {},
  children
}) {
  const tones = {
    neutral: {
      bg: "var(--bg-elev)",
      fg: "var(--ink-2)",
      border: "var(--line)"
    },
    ok: {
      bg: "var(--ok-bg)",
      fg: "var(--ok-fg)",
      border: "transparent"
    },
    bad: {
      bg: "var(--bad-bg)",
      fg: "var(--bad-fg)",
      border: "transparent"
    },
    accent: {
      bg: "var(--accent-soft)",
      fg: "var(--accent-ink)",
      border: "transparent"
    },
    solid: {
      bg: "var(--accent)",
      fg: "#fff",
      border: "transparent"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 9px",
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "currentColor"
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Chip.jsx
try { (() => {
/**
 * Chip — small neutral or accent token for materias, filters and metadata.
 * For corpus origins use SourceChip; for case states use Badge.
 */
function Chip({
  accent = false,
  iconLeft = null,
  onRemove,
  style = {},
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 500,
      background: accent ? "var(--accent-soft)" : "var(--bg-elev)",
      color: accent ? "var(--accent-ink)" : "var(--ink-2)",
      border: `1px solid ${accent ? "transparent" : "var(--line)"}`,
      borderRadius: 999,
      ...style
    }
  }, iconLeft, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Quitar",
    style: {
      background: 0,
      border: 0,
      padding: 0,
      display: "inline-flex",
      color: "currentColor",
      cursor: "pointer",
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "10",
    height: "10",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6L6 18"
  }))));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Chip.jsx", error: String((e && e.message) || e) }); }

// components/display/SourceChip.jsx
try { (() => {
/**
 * SourceChip — signature Juris element. A compact, monospaced badge that marks
 * which official corpus a resolution comes from (TC / CS / EP / CSJ), each with
 * its own brand-tinted color. Optionally shows the year.
 */
const SOURCES = {
  "Tribunal Constitucional": {
    abbr: "TC",
    bg: "var(--src-tc-bg)",
    fg: "var(--src-tc-fg)"
  },
  "Corte Suprema": {
    abbr: "CS",
    bg: "var(--src-cs-bg)",
    fg: "var(--src-cs-fg)"
  },
  "El Peruano": {
    abbr: "EP",
    bg: "var(--src-ep-bg)",
    fg: "var(--src-ep-fg)"
  },
  "Cortes Superiores": {
    abbr: "CSJ",
    bg: "var(--accent-soft)",
    fg: "var(--accent-ink)"
  }
};
function SourceChip({
  source = "Tribunal Constitucional",
  abbr,
  year,
  style = {}
}) {
  const c = SOURCES[source] || {
    abbr: abbr || source,
    bg: "var(--accent-soft)",
    fg: "var(--accent-ink)"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 8px",
      background: c.bg,
      color: c.fg,
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.02em",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, abbr || c.abbr), year && /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, "\xB7 ", year));
}
Object.assign(__ds_scope, { SourceChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/SourceChip.jsx", error: String((e && e.message) || e) }); }

// components/display/Stat.jsx
try { (() => {
/**
 * Stat — big serif metric over a small uppercase label. Used in corpus counts,
 * trust signals and alert headers. `highlight` paints the number navy.
 */
function Stat({
  value,
  label,
  highlight = false,
  size = "md",
  style = {}
}) {
  const fs = {
    sm: 26,
    md: 32,
    lg: 40
  }[size] || 32;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: fs,
      fontWeight: 500,
      lineHeight: 1,
      letterSpacing: "-0.02em",
      color: highlight ? "var(--accent)" : "var(--ink)",
      fontFamily: "var(--font-serif)"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink-3)",
      marginTop: 6,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      lineHeight: 1.4
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Stat.jsx", error: String((e && e.message) || e) }); }

// components/display/Tabs.jsx
try { (() => {
/**
 * Tabs — two visual modes:
 *  · "underline" — section navigation (alerts filter, doc sections)
 *  · "segmented" — compact pill switch (Semántica/Literal, PDF/Pregunta/Anotar)
 * Controlled: pass `value` + `onChange`. `items` = [{ value, label, icon? }].
 */
function Tabs({
  items = [],
  value,
  onChange,
  variant = "underline",
  style = {}
}) {
  if (variant === "segmented") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-2)",
        padding: 2,
        ...style
      }
    }, items.map(it => {
      const on = it.value === value;
      return /*#__PURE__*/React.createElement("button", {
        key: it.value,
        onClick: () => onChange && onChange(it.value),
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          padding: "7px 12px",
          border: 0,
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          background: on ? "var(--bg-card)" : "transparent",
          color: on ? "var(--ink)" : "var(--ink-3)",
          boxShadow: on ? "var(--shadow-1)" : "none",
          transition: "all .15s"
        }
      }, it.icon, it.label);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      borderBottom: "1px solid var(--line)",
      ...style
    }
  }, items.map(it => {
    const on = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      onClick: () => onChange && onChange(it.value),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 16px",
        border: 0,
        background: "transparent",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        color: on ? "var(--ink)" : "var(--ink-3)",
        borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
        marginBottom: -1,
        transition: "color .15s"
      }
    }, it.icon, it.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/legal/ResultCard.jsx
try { (() => {
/**
 * ResultCard — a single retrieved resolution in the search results list.
 * Shows the semantic-similarity score (number + bar) on a left rail, the
 * reference + source + materia chips, the case title, metadata, an excerpt
 * with highlighted matches, and the key holding in a navy callout band.
 *
 * `item` = { ref, title, sala, source, materia, fecha, similitud (0–1),
 *            magistrados?, snippet (may contain <mark>), keyHolding }
 */
function ResultCard({
  item = {},
  rank = 1,
  onOpen,
  style = {}
}) {
  const sim = Math.round((item.similitud || 0) * 100);
  const source = item.source || (String(item.sala || "").includes("Tribunal") ? "Tribunal Constitucional" : "Corte Suprema");
  return /*#__PURE__*/React.createElement("article", {
    style: {
      background: "var(--bg-card)",
      border: "1px solid var(--line)",
      borderRadius: "var(--r-3)",
      padding: 24,
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
      minWidth: 60
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--ink-3)"
    }
  }, "#", rank), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 22,
      fontWeight: 500,
      color: "var(--accent)",
      letterSpacing: "-0.02em",
      lineHeight: 1
    }
  }, sim, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--ink-3)",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "similitud"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 3,
      background: "var(--line)",
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${sim}%`,
      height: "100%",
      background: "var(--accent)"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      padding: "3px 8px",
      background: "var(--bg-elev)",
      border: "1px solid var(--line)",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      color: "var(--ink)"
    }
  }, item.ref), /*#__PURE__*/React.createElement(__ds_scope.SourceChip, {
    source: source,
    year: item.year
  }), item.materia && /*#__PURE__*/React.createElement(__ds_scope.Chip, null, item.materia)), /*#__PURE__*/React.createElement("h3", {
    className: "serif",
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 20,
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
      margin: "0 0 6px",
      color: "var(--ink)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onOpen && onOpen(item.id),
    style: {
      cursor: "pointer",
      borderBottom: "1px solid transparent",
      transition: "border-color .15s"
    },
    onMouseEnter: e => e.currentTarget.style.borderColor = "var(--accent)",
    onMouseLeave: e => e.currentTarget.style.borderColor = "transparent"
  }, item.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      fontSize: 12,
      color: "var(--ink-3)",
      marginBottom: 12,
      flexWrap: "wrap"
    }
  }, item.sala && /*#__PURE__*/React.createElement("span", null, item.sala), item.fecha && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, item.fecha)), item.magistrados && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, item.magistrados.length, " magistrados"))), item.snippet && /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 15,
      lineHeight: 1.6,
      color: "var(--ink-2)",
      margin: "0 0 12px",
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    },
    dangerouslySetInnerHTML: {
      __html: item.snippet
    }
  }), item.keyHolding && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px",
      background: "var(--accent-soft)",
      borderRadius: 4,
      borderLeft: "2px solid var(--accent)",
      fontSize: 13,
      color: "var(--accent-ink)",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      marginRight: 6
    }
  }, "Holding:"), /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontFamily: "var(--font-serif)"
    }
  }, item.keyHolding)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen && onOpen(item.id),
    className: "btn btn-sm"
  }, "Ver sentencia"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost"
  }, "Citar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost"
  }, "Guardar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    style: {
      color: "var(--accent)"
    }
  }, "Resumir con IA"))));
}
Object.assign(__ds_scope, { ResultCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/ResultCard.jsx", error: String((e && e.message) || e) }); }

// components/legal/SearchBar.jsx
try { (() => {
/**
 * SearchBar — the front door of Juris PE. A serif-set natural-language query
 * field flagged as semantic search, with a navy submit button. `large` for
 * hero placement, default for in-app strips.
 */
function SearchBar({
  value = "",
  onChange,
  onSubmit,
  large = false,
  semanticLabel = "Búsqueda semántica",
  placeholder = 'Pregunta en lenguaje natural: "requisitos de prisión preventiva según el TC"',
  style = {}
}) {
  const [focused, setFocused] = React.useState(false);
  const submit = () => onSubmit && onSubmit(value);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--bg-card)",
      border: `1.5px solid ${focused ? "var(--accent)" : "var(--line-2)"}`,
      borderRadius: large ? 10 : 8,
      padding: large ? "14px 18px" : "10px 14px",
      boxShadow: focused ? "var(--ring)" : "var(--shadow-1)",
      transition: "all .15s",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-3)",
      display: "inline-flex",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: large ? 20 : 16,
    height: large ? 20 : 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m20 20-3.5-3.5"
  }))), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    },
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: "none",
      background: "transparent",
      fontSize: large ? 17 : 14,
      fontFamily: "var(--font-serif)",
      color: "var(--ink)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 10px",
      borderRadius: 999,
      background: "var(--accent-soft)",
      color: "var(--accent-ink)",
      fontSize: 11,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "11",
    height: "11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
  })), semanticLabel), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    onMouseEnter: e => e.currentTarget.style.background = "var(--accent-2)",
    onMouseLeave: e => e.currentTarget.style.background = "var(--accent)",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: large ? "10px 18px" : "7px 14px",
      fontSize: large ? 14 : 12,
      fontWeight: 500,
      background: "var(--accent)",
      color: "#fff",
      border: 0,
      borderRadius: "var(--r-2)",
      cursor: "pointer",
      transition: "background .15s"
    }
  }, "Buscar", /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  })))));
}
Object.assign(__ds_scope, { SearchBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/SearchBar.jsx", error: String((e && e.message) || e) }); }

// components/legal/SynthesisCallout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SynthesisCallout — the RAG answer block shown above search results. Renders
 * synthesized text with inline [N] markers wired to a verifiable source list,
 * framed by the "verify every citation" trust banner. The navy left rule and
 * sparkles header mark machine-generated content.
 *
 * `text` may contain [1] [2] … markers; `citations` = [{ n, ref, fuente, fecha }].
 */
function SynthesisCallout({
  text = "",
  citations = [],
  generatedFrom,
  activeCitation = null,
  onCite,
  style = {}
}) {
  const parts = String(text).split(/(\[\d+\])/);
  const Spark = s => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, s), /*#__PURE__*/React.createElement("path", {
    d: "M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
  }));
  return /*#__PURE__*/React.createElement("article", {
    style: {
      background: "var(--bg-card)",
      border: "1px solid var(--line)",
      borderLeft: "3px solid var(--accent)",
      borderRadius: 8,
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 18px",
      background: "var(--accent-soft)",
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      display: "inline-flex"
    }
  }, Spark()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "var(--accent-ink)"
    }
  }, "S\xEDntesis JURIS"), generatedFrom && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--accent-ink)",
      opacity: 0.7
    }
  }, generatedFrom)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 32px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: 17,
      lineHeight: 1.7,
      color: "var(--ink)",
      margin: "0 0 24px"
    }
  }, parts.map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (m) {
      const n = parseInt(m[1], 10);
      return /*#__PURE__*/React.createElement(__ds_scope.CitationRef, {
        key: i,
        variant: "marker",
        n: n,
        active: activeCitation === n,
        onClick: () => onCite && onCite(n)
      });
    }
    return /*#__PURE__*/React.createElement("span", {
      key: i
    }, p);
  })), citations.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--ink-3)",
      fontWeight: 600,
      marginBottom: 10
    }
  }, "Fuentes citadas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, citations.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.n,
    onClick: () => onCite && onCite(c.n),
    style: {
      display: "grid",
      gridTemplateColumns: "28px 1fr auto",
      gap: 10,
      alignItems: "center",
      padding: "10px 12px",
      background: activeCitation === c.n ? "var(--accent-soft)" : "var(--bg)",
      border: `1px solid ${activeCitation === c.n ? "var(--accent)" : "var(--line)"}`,
      borderRadius: 6,
      cursor: "pointer",
      transition: "all .15s"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 4,
      background: "var(--accent)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 11
    }
  }, c.n), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 500,
      color: "var(--ink)"
    }
  }, c.ref), (c.fuente || c.fecha) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink-3)",
      marginTop: 2
    }
  }, [c.fuente, c.fecha].filter(Boolean).join(" · "))), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "12",
    height: "12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"
  }))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      paddingTop: 14,
      borderTop: "1px solid var(--line)",
      fontSize: 12,
      color: "var(--ink-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }))), /*#__PURE__*/React.createElement("span", null, "Toda afirmaci\xF3n est\xE1 enlazada a una sentencia del corpus. Verifica cada cita antes de citar formalmente."))));
}
Object.assign(__ds_scope, { SynthesisCallout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/legal/SynthesisCallout.jsx", error: String((e && e.message) || e) }); }

// ui_kits/juris-web/app.jsx
try { (() => {
/* global React, ReactDOM, KitHeader, KitFooter, KitLanding, KitResults, KitSentence */
function KitApp() {
  const [screen, setScreen] = React.useState("landing");
  const [query, setQuery] = React.useState("Presidente Pedro Castillo");
  const onSearch = q => {
    setQuery(q && q.trim() ? q : "Presidente Pedro Castillo");
    setScreen("search");
    window.scrollTo({
      top: 0
    });
  };
  const onNav = s => {
    setScreen(s);
    window.scrollTo({
      top: 0
    });
  };
  const onOpenSentence = () => {
    setScreen("sentence");
    window.scrollTo({
      top: 0
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KitHeader, {
    current: screen === "sentence" ? "search" : screen,
    onNav: onNav
  }), screen === "landing" && /*#__PURE__*/React.createElement(KitLanding, {
    onSearch: onSearch
  }), screen === "search" && /*#__PURE__*/React.createElement(KitResults, {
    initialQuery: query,
    onOpenSentence: onOpenSentence
  }), screen === "sentence" && /*#__PURE__*/React.createElement(KitSentence, {
    onNav: onNav,
    queryContext: query
  }), /*#__PURE__*/React.createElement(KitFooter, null));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(KitApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/juris-web/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/juris-web/chrome.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
// Kit-local icons (stroke set matching the brand) + shared chrome.
const KIcon = {
  search: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m20 20-3.5-3.5"
  })),
  arrow: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  })),
  spark: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 16v4M17 18h4"
  })),
  check: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M4 12l5 5L20 6"
  })),
  shield: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  })),
  doc: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 3v5h5M9 13h6M9 17h4"
  })),
  scales: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18M5 21h14M6 6h12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 6l-3 7a3 3 0 0 0 6 0L6 6zM18 6l-3 7a3 3 0 0 0 6 0L18 6z"
  })),
  brain: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5.5V16a3 3 0 0 0 4 2.8M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5.5V16a3 3 0 0 1-4 2.8"
  })),
  trend: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M3 17l6-6 4 4 7-7M14 7h6v6"
  })),
  bell: p => /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: "18",
    height: "18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 0 0 4 0"
  }))
};
function KitHeader({
  current,
  onNav
}) {
  const {
    Logo,
    Button
  } = window.JurisPEDesignSystem_cf0a1e;
  const nav = [["landing", "Inicio"], ["search", "Buscar"], ["alerts", "Alertas"], ["pricing", "Planes"], ["sources", "Fuentes"]];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      background: "color-mix(in srgb, var(--bg) 88%, transparent)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container row",
    style: {
      height: 64,
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav("landing"),
    style: {
      background: "transparent",
      border: 0,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 22
  })), /*#__PURE__*/React.createElement("nav", {
    className: "row gap-1",
    style: {
      marginLeft: "var(--space-5)"
    }
  }, nav.map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => onNav(k === "search" ? "search" : "landing"),
    className: "btn btn-ghost btn-sm",
    style: {
      color: current === k ? "var(--ink)" : "var(--ink-3)",
      fontWeight: 500,
      padding: "8px 12px"
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      padding: 8,
      color: "var(--ink-3)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(KIcon.bell, null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 4,
      right: 4,
      minWidth: 15,
      height: 15,
      background: "var(--accent)",
      color: "#fff",
      borderRadius: 999,
      fontSize: 9,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "2px solid var(--bg)"
    }
  }, "3")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      color: "var(--ink-3)"
    }
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Solicitar demo")));
}
function KitFooter() {
  const {
    Logo
  } = window.JurisPEDesignSystem_cf0a1e;
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--line)",
      padding: "var(--space-7) 0 var(--space-6)",
      marginTop: "var(--space-9)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    size: 20
  }), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontSize: 15,
      color: "var(--ink-3)",
      marginTop: 12,
      maxWidth: 320,
      lineHeight: 1.55
    }
  }, "Buscador inteligente de jurisprudencia peruana. Indexa Corte Suprema, Tribunal Constitucional, El Peruano y cortes superiores desde 1996.")), [{
    t: "Producto",
    l: ["Buscador", "Análisis con IA", "API", "Plugin para Word"]
  }, {
    t: "Recursos",
    l: ["Guía de uso", "Operadores", "Casos de uso", "Blog"]
  }, {
    t: "Empresa",
    l: ["Sobre nosotros", "Contacto", "Términos", "Privacidad"]
  }].map(col => /*#__PURE__*/React.createElement("div", {
    key: col.t,
    className: "col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--ink-3)"
    }
  }, col.t), col.l.map(li => /*#__PURE__*/React.createElement("a", {
    key: li,
    style: {
      color: "var(--ink-2)",
      fontSize: 13,
      cursor: "pointer"
    }
  }, li))))), /*#__PURE__*/React.createElement("hr", {
    className: "rule",
    style: {
      margin: "var(--space-6) 0 var(--space-4)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between",
      color: "var(--ink-4)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Juris PE \xB7 Hecho en Lima"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "v2.4 \xB7 \xDAltima actualizaci\xF3n del corpus: 14 May 2026"))));
}
Object.assign(window, {
  KIcon,
  KitHeader,
  KitFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/juris-web/chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/juris-web/kit-data.js
try { (() => {
/* Mock data for the Juris PE UI kit — distilled from the source prototype. */
window.KIT_DATA = {
  sources: [{
    abbr: "CS",
    name: "Corte Suprema",
    count: "412,860",
    years: "1996 — 2026",
    desc: "Casaciones de las Salas Penales, Civiles, Constitucionales y Laborales."
  }, {
    abbr: "TC",
    name: "Tribunal Constitucional",
    count: "38,204",
    years: "1996 — 2026",
    desc: "Sentencias del Pleno y Salas. Habeas corpus, amparos, inconstitucionalidad."
  }, {
    abbr: "CSJ",
    name: "Cortes Superiores",
    count: "684,201",
    years: "2005 — 2026",
    desc: "33 distritos judiciales. Sentencias de segunda instancia y revisiones."
  }, {
    abbr: "EP",
    name: "El Peruano",
    count: "1.2M",
    years: "1996 — 2026",
    desc: "Leyes, decretos supremos y resoluciones administrativas oficiales."
  }],
  onboarding: [{
    who: "Abogado litigante",
    goal: "Encuentra precedentes para tu próxima audiencia",
    query: "¿Cuáles son los requisitos para la prisión preventiva según el TC?"
  }, {
    who: "Asistente judicial",
    goal: "Verifica criterios uniformes en tu sala",
    query: "Criterios uniformes en casación sobre desnaturalización laboral"
  }, {
    who: "Académico / docente",
    goal: "Investiga la evolución de una doctrina",
    query: "Evolución del control difuso en el TC peruano 2002-2024"
  }, {
    who: "Estudiante",
    goal: "Prepara casos para clase con jurisprudencia real",
    query: "Casos típicos de responsabilidad civil extracontractual"
  }],
  steps: [{
    n: "01",
    title: "Formulación de la consulta",
    body: "Escribe en lenguaje natural o pega un fragmento. El sistema interpreta el sentido jurídico, no solo las palabras."
  }, {
    n: "02",
    title: "Recuperación semántica",
    body: "Embeddings entrenados con corpus jurídico peruano recuperan los párrafos relevantes de 2.3M de resoluciones."
  }, {
    n: "03",
    title: "Síntesis con cita verificable",
    body: "El modelo redacta una respuesta concisa enlazando cada afirmación a la fuente oficial. Sin alucinaciones."
  }, {
    n: "04",
    title: "Verificación humana",
    body: "Accede al documento original, ve el párrafo destacado en contexto y exporta la cita en estilo PUCP o APA."
  }],
  comparison: [{
    q: "Despido encubierto sin causa",
    kw: "0 resultados directos",
    sem: "127 casaciones sobre simulación, fraude laboral y desnaturalización contractual"
  }, {
    q: "¿El TC puede revisar la vacancia presidencial?",
    kw: 'Cualquier sentencia con "vacancia"',
    sem: "STC 00006-2003-AI, 00156-2023-AA — control de razonabilidad parlamentaria"
  }, {
    q: "Indemnización por daño moral en ruptura familiar",
    kw: 'Resultados de "daño moral" en general',
    sem: "Casaciones específicas: art. 351 CC, separación, divorcio por causal"
  }],
  trust: [{
    n: "94%",
    l: "Precisión en recuperación top-3"
  }, {
    n: "2.3M",
    l: "Resoluciones indexadas"
  }, {
    n: "4.2s",
    l: "Tiempo promedio de respuesta"
  }, {
    n: "0",
    l: "Citas inventadas. Solo del corpus."
  }],
  materias: ["Constitucional", "Penal", "Civil", "Laboral", "Contencioso Administrativo", "Tributario", "Familia"],
  years: ["2024", "2023", "2022", "2021", "2020", "2010-2018"],
  salas: ["Pleno del TC", "Sala Penal Permanente", "Sala Penal Especial", "Sala Civil Permanente", "Primera Sala del TC", "Segunda Sala del TC"],
  related: ["Vacancia presidencial por incapacidad moral", "Disolución del Congreso art. 134", "Prisión preventiva en altos funcionarios", "Hábeas corpus contra prisión preventiva"],
  norms: [{
    ref: "Const. Art. 113",
    t: "Causales de vacancia presidencial"
  }, {
    ref: "Const. Art. 134",
    t: "Disolución del Congreso"
  }, {
    ref: "CPP Art. 268",
    t: "Presupuestos de prisión preventiva"
  }],
  synthesis: {
    text: "Las resoluciones referidas al ex-Presidente Pedro Castillo Terrones se concentran en torno al intento de disolución del Congreso del 7 de diciembre de 2022 y los procesos penales subsecuentes. El Tribunal Constitucional, en el Expediente 00007-2022-PI/TC, declaró la inconstitucionalidad del decreto de disolución, calificando el acto como un quiebre del orden constitucional[1]. La Sala Penal Especial de la Corte Suprema dictó prisión preventiva por 18 meses bajo los cargos de rebelión, conspiración y abuso de autoridad[2]. En materia de vacancia, el Congreso aplicó el artículo 113.2 de la Constitución por incapacidad moral permanente, decisión cuya validez fue revisada por el TC[3].",
    citations: [{
      n: 1,
      ref: "STC 00007-2022-PI/TC",
      fuente: "Tribunal Constitucional",
      fecha: "16 Mar 2023"
    }, {
      n: 2,
      ref: "Res. N° 02-2022-SPE/CSJ",
      fuente: "Sala Penal Especial — CS",
      fecha: "15 Dic 2022"
    }, {
      n: 3,
      ref: "STC 00156-2023-AA/TC",
      fuente: "Tribunal Constitucional",
      fecha: "04 Jul 2023"
    }]
  },
  results: {
    query: "Presidente Pedro Castillo",
    total: 247,
    timeMs: 412,
    items: [{
      id: "stc-00007-2022",
      ref: "STC 00007-2022-PI/TC",
      title: "Demanda de inconstitucionalidad contra el Decreto Supremo de disolución del Congreso",
      sala: "Pleno del Tribunal Constitucional",
      source: "Tribunal Constitucional",
      materia: "Constitucional",
      fecha: "16 de marzo de 2023",
      year: 2023,
      magistrados: ["A", "B", "C", "D", "E", "F"],
      similitud: 0.94,
      snippet: "Que, el acto realizado por el entonces <mark class='hl'>Presidente Pedro Castillo</mark> Terrones, al pretender disolver el Congreso sin observar el artículo 134 de la Constitución, constituye una ruptura del orden constitucional…",
      keyHolding: "El acto del 7 de diciembre de 2022 carece de cobertura constitucional. La defensa de la Constitución corresponde a todo ciudadano (art. 46)."
    }, {
      id: "res-02-2022",
      ref: "Res. N° 02-2022-SPE/CSJ",
      title: "Prisión preventiva — Caso golpe de Estado",
      sala: "Sala Penal Especial — Corte Suprema",
      source: "Corte Suprema",
      materia: "Penal",
      fecha: "15 de diciembre de 2022",
      year: 2022,
      magistrados: ["A", "B", "C"],
      similitud: 0.91,
      snippet: "Se impone mandato de prisión preventiva por dieciocho (18) meses contra <mark class='hl'>Pedro Castillo</mark> Terrones, por la presunta comisión de los delitos de rebelión, conspiración y abuso de autoridad, al concurrir los presupuestos del artículo 268 del CPP…",
      keyHolding: "Concurren los tres presupuestos materiales del art. 268 CPP. Peligro de fuga sustentado en el intento previo de asilo."
    }, {
      id: "stc-00156-2023",
      ref: "STC 00156-2023-AA/TC",
      title: "Amparo contra la Resolución del Congreso N° 001-2022-2023-CR (vacancia)",
      sala: "Pleno del Tribunal Constitucional",
      source: "Tribunal Constitucional",
      materia: "Constitucional",
      fecha: "04 de julio de 2023",
      year: 2023,
      magistrados: ["A", "B", "C"],
      similitud: 0.88,
      snippet: "El recurrente cuestiona la Resolución del Congreso que declaró la vacancia de la <mark class='hl'>Presidencia de Pedro Castillo</mark> por incapacidad moral permanente. Este Tribunal ha establecido que la causal del artículo 113.2 contiene un concepto jurídico indeterminado…",
      keyHolding: "La vacancia por incapacidad moral permanente es atribución exclusiva del Congreso. Control limitado a razonabilidad."
    }]
  },
  sentence: {
    ref: "STC 00061-2023-PHC/TC",
    caso: "Caso Vargas Romero",
    tipo: "Hábeas corpus",
    estado: "Firme",
    fallo: "INFUNDADA",
    title: "Hábeas corpus contra la prisión preventiva por falta de motivación de los presupuestos materiales",
    sala: "Primera Sala del Tribunal Constitucional",
    fecha: "12 de febrero de 2024",
    ponente: "Pacheco Zerga",
    pdfPages: 42,
    toc: [{
      key: "petitorio",
      label: "§1 Petitorio",
      page: 5
    }, {
      key: "analisis",
      label: "§2 Análisis del caso",
      page: 8
    }, {
      key: "fundamentos",
      label: "§3 Fundamentos",
      page: 12
    }, {
      key: "decision",
      label: "§4 Decisión",
      page: 39
    }],
    magistrados: [{
      n: "Pacheco Zerga",
      v: "Ponente"
    }, {
      n: "Morales Saravia",
      v: "Presidente"
    }, {
      n: "Gutiérrez Ticse",
      v: "Voto singular"
    }],
    sections: {
      petitorio: {
        title: "§1. Petitorio",
        page: 5,
        paragraphs: ["El objeto de la presente demanda es que se declare la nulidad de la Resolución N.° 18, de fecha 12 de octubre de 2023, así como de la Resolución de Vista N.° 35, de fecha 9 de noviembre de 2023.", "Se aduce que las resoluciones cuestionadas no estarían debidamente motivadas respecto de los presupuestos materiales requeridos para dictar la prisión preventiva contra el favorecido, vulnerando los derechos a la libertad personal y al debido proceso."]
      },
      analisis: {
        title: "§2. Análisis del caso",
        page: 8,
        paragraphs: ["Este Tribunal ha establecido en uniforme jurisprudencia que la prisión preventiva es una medida cautelar de carácter excepcional, sujeta al deber de motivación reforzada conforme a la STC 04780-2017-PHC/TC.", "La motivación brindada por el a quo desarrolla los elementos de convicción específicos, la prognosis de pena superior a 4 años y el peligro procesal con análisis individualizado."]
      }
    },
    citas: [{
      ref: "STC 04780-2017-PHC/TC",
      caso: "Humala Tasso",
      count: 6,
      relevance: "Estándar de motivación reforzada."
    }, {
      ref: "Art. 268 CPP",
      caso: "Presupuestos materiales",
      count: 4,
      relevance: "Tres presupuestos de la prisión preventiva."
    }]
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/juris-web/kit-data.js", error: String((e && e.message) || e) }); }

// ui_kits/juris-web/landing.jsx
try { (() => {
/* global React, KIcon */
function KitLanding({
  onSearch
}) {
  const {
    SearchBar,
    Stat,
    SourceChip,
    Button
  } = window.JurisPEDesignSystem_cf0a1e;
  const D = window.KIT_DATA;
  const [q, setQ] = React.useState("");
  return /*#__PURE__*/React.createElement("main", {
    "data-screen-label": "Landing"
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0 var(--space-7)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      right: -120,
      top: -60,
      width: 540,
      height: 540,
      background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "container-narrow",
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      justifyContent: "center",
      marginBottom: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "chip",
    style: {
      gap: 6,
      background: "var(--bg-elev)"
    }
  }, /*#__PURE__*/React.createElement(KIcon.spark, null), " Nuevo \xB7 B\xFAsqueda con IA generativa")), /*#__PURE__*/React.createElement("h1", {
    className: "serif",
    style: {
      fontSize: "clamp(44px, 6vw, 76px)",
      fontWeight: 400,
      lineHeight: 1.02,
      letterSpacing: "-0.025em",
      textAlign: "center",
      margin: "0 0 var(--space-4)",
      textWrap: "balance"
    }
  }, "La jurisprudencia peruana,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", {
    style: {
      fontStyle: "italic",
      color: "var(--accent)"
    }
  }, "como una conversaci\xF3n.")), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontSize: 19,
      lineHeight: 1.55,
      color: "var(--ink-2)",
      textAlign: "center",
      maxWidth: 620,
      margin: "0 auto var(--space-6)",
      textWrap: "balance"
    }
  }, "Pregunta en espa\xF1ol natural. Recibe la respuesta sintetizada con citas verificables a sentencias del TC, Corte Suprema y El Peruano desde 1996."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(SearchBar, {
    large: true,
    value: q,
    onChange: setQ,
    onSubmit: onSearch
  })), /*#__PURE__*/React.createElement("div", {
    className: "row gap-4",
    style: {
      justifyContent: "center",
      marginTop: "var(--space-5)",
      flexWrap: "wrap"
    }
  }, ["Sin tarjeta de crédito", "10 consultas gratis al día", "Garantía de fuente oficial"].map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "row gap-2",
    style: {
      fontSize: 12,
      color: "var(--ink-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, /*#__PURE__*/React.createElement(KIcon.check, null)), " ", t))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0",
      background: "var(--bg-elev)",
      borderTop: "1px solid var(--line)",
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 620,
      marginBottom: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Empieza por aqu\xED"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      margin: "0 0 12px",
      textWrap: "balance"
    }
  }, "\xBFReci\xE9n llegas? Prueba una de estas."), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontSize: 17,
      color: "var(--ink-2)",
      margin: 0
    }
  }, "Cuatro escenarios t\xEDpicos. Haz click en cualquiera para ver el flujo completo.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "var(--space-4)"
    }
  }, D.onboarding.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.who,
    onClick: () => onSearch(c.query),
    className: "card",
    style: {
      padding: "var(--space-5)",
      textAlign: "left",
      background: "var(--bg-card)",
      cursor: "pointer",
      transition: "all .2s",
      border: "1px solid var(--line)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = "var(--accent)";
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "var(--shadow-2)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = "var(--line)";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontWeight: 600,
      color: "var(--accent)"
    }
  }, c.who), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-4)"
    }
  }, /*#__PURE__*/React.createElement(KIcon.arrow, null))), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 18,
      fontWeight: 500,
      lineHeight: 1.3,
      margin: "0 0 12px",
      color: "var(--ink)"
    }
  }, c.goal), /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      padding: "10px 12px",
      background: "var(--bg)",
      border: "1px solid var(--line)",
      borderRadius: 6,
      fontSize: 13,
      color: "var(--ink-2)",
      fontFamily: "var(--font-serif)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-4)"
    }
  }, /*#__PURE__*/React.createElement(KIcon.search, null)), /*#__PURE__*/React.createElement("span", null, "\"", c.query, "\""))))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: "var(--space-6)",
      flexWrap: "wrap",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "C\xF3mo funciona"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      margin: 0,
      textWrap: "balance"
    }
  }, "Cuatro pasos. Cita oficial al final.")), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontSize: 16,
      color: "var(--ink-2)",
      maxWidth: 420,
      margin: 0
    }
  }, "A diferencia de un buscador por palabras clave, JURIS comprende intenci\xF3n, contexto y referencias cruzadas entre normas.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "var(--space-4)"
    }
  }, D.steps.map((s, i) => {
    const icons = [/*#__PURE__*/React.createElement(KIcon.brain, null), /*#__PURE__*/React.createElement(KIcon.scales, null), /*#__PURE__*/React.createElement(KIcon.spark, null), /*#__PURE__*/React.createElement(KIcon.shield, null)];
    return /*#__PURE__*/React.createElement("div", {
      key: s.n,
      style: {
        padding: "var(--space-5)",
        borderTop: "1px solid var(--line-2)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "row",
      style: {
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 18
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mono",
      style: {
        fontSize: 13,
        color: "var(--accent)",
        fontWeight: 600
      }
    }, s.n), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--accent)"
      }
    }, icons[i])), /*#__PURE__*/React.createElement("h3", {
      className: "serif",
      style: {
        fontSize: 19,
        fontWeight: 500,
        margin: "0 0 8px",
        lineHeight: 1.25,
        letterSpacing: "-0.01em"
      }
    }, s.title), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        lineHeight: 1.55,
        color: "var(--ink-2)",
        margin: 0
      }
    }, s.body));
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0",
      background: "var(--bg-elev)",
      borderTop: "1px solid var(--line)",
      borderBottom: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      marginBottom: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Por qu\xE9 JURIS"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      margin: "0 0 12px",
      textWrap: "balance"
    }
  }, "B\xFAsqueda por palabra clave vs. b\xFAsqueda por ", /*#__PURE__*/React.createElement("em", {
    style: {
      color: "var(--accent)"
    }
  }, "sentido"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      padding: "12px 20px",
      borderBottom: "1px solid var(--line)",
      background: "var(--bg)",
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--ink-3)",
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1.2
    }
  }, "Consulta del usuario"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, "Buscador tradicional"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1.4,
      color: "var(--accent)"
    }
  }, "JURIS \xB7 Sem\xE1ntica + RAG")), D.comparison.map((ex, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "row",
    style: {
      padding: "18px 20px",
      borderBottom: i === D.comparison.length - 1 ? 0 : "1px solid var(--line)",
      alignItems: "flex-start",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      flex: 1.2,
      fontSize: 16,
      fontWeight: 500,
      color: "var(--ink)",
      lineHeight: 1.3
    }
  }, "\"", ex.q, "\""), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      color: "var(--ink-3)",
      paddingTop: 2
    }
  }, ex.kw), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1.4,
      fontSize: 13,
      color: "var(--ink-2)",
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      fontWeight: 600
    }
  }, "\u2192"), " ", ex.sem)))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560,
      marginBottom: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Fuentes oficiales"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      margin: 0,
      textWrap: "balance"
    }
  }, "Corpus completo desde 1996. ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-3)"
    }
  }, "Solo fuentes oficiales."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "var(--space-4)"
    }
  }, D.sources.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.abbr,
    className: "card",
    style: {
      padding: "var(--space-5)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -20,
      top: -20,
      fontFamily: "var(--font-serif)",
      fontSize: 96,
      fontWeight: 300,
      color: "var(--accent)",
      opacity: 0.08,
      lineHeight: 1,
      letterSpacing: "-0.04em"
    }
  }, s.abbr), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink-3)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 600,
      marginBottom: 6
    }
  }, s.abbr), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      margin: "0 0 4px",
      letterSpacing: "-0.01em"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 32,
      fontWeight: 400,
      color: "var(--accent)",
      margin: "12px 0 4px"
    }
  }, s.count), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 12,
      color: "var(--ink-3)",
      margin: "0 0 14px"
    }
  }, s.years), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--ink-2)",
      lineHeight: 1.5,
      margin: 0
    }
  }, s.desc)))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0",
      borderTop: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1.4fr",
      gap: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Confianza"), /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
      margin: "0 0 var(--space-5)",
      textWrap: "balance"
    }
  }, "Dise\xF1ado para quienes ", /*#__PURE__*/React.createElement("em", {
    style: {
      color: "var(--accent)"
    }
  }, "no pueden equivocarse"), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-5)"
    }
  }, D.trust.map(s => /*#__PURE__*/React.createElement(Stat, {
    key: s.l,
    value: s.n,
    label: s.l,
    size: "lg"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "col gap-4"
  }, [{
    text: "Reemplazó tres herramientas: un buscador legal, un servicio de alertas y un practicante. Pago menos y avanzo más rápido.",
    author: "Dra. Lucía Aguinaga",
    role: "Estudio Aguinaga & Asoc., Lima"
  }, {
    text: "La síntesis con citas es lo que cambia todo. Me da una respuesta que puedo verificar en el original en dos clicks.",
    author: "Mg. Carlos Mendoza Ríos",
    role: "Sala Penal Liquidadora · CSJ Arequipa"
  }].map((quote, i) => /*#__PURE__*/React.createElement("figure", {
    key: i,
    style: {
      margin: 0,
      padding: "var(--space-5)",
      borderLeft: "2px solid var(--accent)",
      background: "var(--bg-elev)"
    }
  }, /*#__PURE__*/React.createElement("blockquote", {
    className: "serif",
    style: {
      fontSize: 17,
      lineHeight: 1.5,
      margin: 0,
      color: "var(--ink)"
    }
  }, "\"", quote.text, "\""), /*#__PURE__*/React.createElement("figcaption", {
    style: {
      marginTop: 14,
      fontSize: 12,
      color: "var(--ink-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-2)",
      fontWeight: 600
    }
  }, quote.author), " \xB7 ", quote.role))))))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "var(--space-8) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-8) var(--space-7)",
      background: "var(--accent)",
      borderRadius: 14,
      color: "#fff",
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: "var(--space-6)",
      alignItems: "center",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      right: -120,
      bottom: -80,
      fontFamily: "var(--font-serif)",
      fontSize: 380,
      fontWeight: 300,
      color: "#fff",
      opacity: 0.05,
      lineHeight: 0.8
    }
  }, "\xA7"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 44,
      fontWeight: 400,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
      margin: "0 0 16px",
      color: "#fff",
      textWrap: "balance"
    }
  }, "Pru\xE9balo con tu pr\xF3ximo caso real."), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontSize: 18,
      color: "rgba(255,255,255,0.85)",
      margin: "0 0 var(--space-5)",
      maxWidth: 460
    }
  }, "Demo personalizada de 30 minutos con un especialista jur\xEDdico. Sin compromiso."), /*#__PURE__*/React.createElement("div", {
    className: "row gap-3"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(KIcon.arrow, null),
    style: {
      background: "#fff",
      color: "var(--accent-ink)",
      border: "1px solid #fff",
      fontWeight: 600
    }
  }, "Solicitar demo"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    style: {
      background: "transparent",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.3)"
    }
  }, "Ver planes"))), /*#__PURE__*/React.createElement("div", {
    className: "col gap-3",
    style: {
      position: "relative"
    }
  }, ["Onboarding completo para tu equipo", "Integración con tu flujo (Word, PDF)", "API para automatizar búsquedas masivas", "Soporte por WhatsApp en hora peruana"].map(b => /*#__PURE__*/React.createElement("div", {
    key: b,
    className: "row gap-3",
    style: {
      padding: "12px 14px",
      background: "rgba(255,255,255,0.08)",
      borderRadius: 6,
      fontSize: 14,
      color: "rgba(255,255,255,0.95)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement(KIcon.check, null)), b)))))));
}
Object.assign(window, {
  KitLanding
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/juris-web/landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/juris-web/results.jsx
try { (() => {
/* global React, KIcon */
function KitResults({
  initialQuery,
  onOpenSentence
}) {
  const {
    SearchBar,
    SynthesisCallout,
    ResultCard,
    Tabs,
    Checkbox,
    Chip,
    Button
  } = window.JurisPEDesignSystem_cf0a1e;
  const D = window.KIT_DATA;
  const [query, setQuery] = React.useState(initialQuery || D.results.query);
  const [mode, setMode] = React.useState("semantic");
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState(null);
  const [materias, setMaterias] = React.useState([]);
  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, [query, mode, materias.join()]);
  const items = materias.length ? D.results.items.filter(i => materias.includes(i.materia)) : D.results.items;
  const toggleMateria = m => setMaterias(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m]);
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Resultados de b\xFAsqueda"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-elev)",
      borderBottom: "1px solid var(--line)",
      padding: "var(--space-4) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: "var(--space-4)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(SearchBar, {
    value: query,
    onChange: setQuery,
    onSubmit: setQuery
  }), /*#__PURE__*/React.createElement(Tabs, {
    variant: "segmented",
    value: mode,
    onChange: setMode,
    items: [{
      value: "semantic",
      label: "Semántica",
      icon: /*#__PURE__*/React.createElement(KIcon.spark, null)
    }, {
      value: "texto",
      label: "Literal"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginTop: 14,
      gap: 14,
      color: "var(--ink-3)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, items.length), " de ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, D.results.total), " resoluciones"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, D.results.timeMs, "ms"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Ordenado por ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      fontWeight: 500
    }
  }, "similitud"))))), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      padding: "var(--space-6) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "220px 1fr 300px",
      gap: "var(--space-6)",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      position: "sticky",
      top: 80
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Filtros"), materias.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setMaterias([]),
    style: {
      background: 0,
      border: 0,
      color: "var(--ink-3)",
      fontSize: 11,
      cursor: "pointer",
      textDecoration: "underline"
    }
  }, "Limpiar")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--ink-2)",
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "Materia"), /*#__PURE__*/React.createElement("div", {
    className: "col gap-1",
    style: {
      marginBottom: 18
    }
  }, D.materias.map(m => /*#__PURE__*/React.createElement(Checkbox, {
    key: m,
    checked: materias.includes(m),
    onChange: () => toggleMateria(m),
    label: m
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--ink-2)",
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      paddingTop: 18,
      borderTop: "1px solid var(--line)"
    }
  }, "A\xF1o"), /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      flexWrap: "wrap"
    }
  }, D.years.map(y => /*#__PURE__*/React.createElement(Chip, {
    key: y
  }, y)))), /*#__PURE__*/React.createElement("main", {
    className: "col gap-5"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      width: 140,
      height: 16,
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      height: 14,
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      height: 14,
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      height: 14,
      width: "80%"
    }
  })) : /*#__PURE__*/React.createElement(SynthesisCallout, {
    text: D.synthesis.text,
    citations: D.synthesis.citations,
    generatedFrom: "Generado a partir de 3 sentencias recuperadas",
    activeCitation: active,
    onCite: setActive
  }), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 22,
      fontWeight: 500,
      margin: 0,
      letterSpacing: "-0.01em"
    }
  }, "Resoluciones recuperadas"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    style: {
      color: "var(--accent)",
      borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)"
    },
    iconLeft: /*#__PURE__*/React.createElement(KIcon.bell, null)
  }, "Crear alerta")), loading ? [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card",
    style: {
      padding: "var(--space-5)",
      display: "flex",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      width: 60,
      height: 60
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      width: 220,
      height: 14,
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      width: "70%",
      height: 18,
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      height: 12,
      marginBottom: 6
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton",
    style: {
      height: 12,
      width: "85%"
    }
  })))) : items.map((r, i) => /*#__PURE__*/React.createElement(ResultCard, {
    key: r.id,
    item: r,
    rank: i + 1,
    onOpen: onOpenSentence
  }))), /*#__PURE__*/React.createElement("aside", {
    className: "col gap-5",
    style: {
      position: "sticky",
      top: 80
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(KIcon.trend, null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--ink-2)"
    }
  }, "B\xFAsquedas relacionadas")), /*#__PURE__*/React.createElement("div", {
    className: "col gap-1"
  }, D.related.map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    onClick: () => setQuery(r),
    style: {
      textAlign: "left",
      padding: "8px 10px",
      border: 0,
      background: "transparent",
      borderRadius: 4,
      fontSize: 13,
      color: "var(--ink-2)",
      cursor: "pointer",
      fontFamily: "var(--font-serif)"
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = "var(--bg-elev)";
      e.currentTarget.style.color = "var(--accent)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = "var(--ink-2)";
    }
  }, r, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-4)"
    }
  }, "\u2192"))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(KIcon.scales, null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "var(--ink-2)"
    }
  }, "Normas m\xE1s citadas")), /*#__PURE__*/React.createElement("div", {
    className: "col gap-2"
  }, D.norms.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.ref,
    className: "row gap-3",
    style: {
      padding: "6px 0",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--accent)",
      padding: "2px 6px",
      background: "var(--accent-soft)",
      borderRadius: 3,
      flexShrink: 0
    }
  }, n.ref), /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      color: "var(--ink-2)",
      lineHeight: 1.35
    }
  }, n.t))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4)",
      background: "var(--ink)",
      color: "var(--bg)",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 17,
      fontWeight: 500,
      lineHeight: 1.3,
      marginBottom: 10,
      color: "var(--bg)"
    }
  }, "Compara dos sentencias con an\xE1lisis de IA"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      background: "var(--bg)",
      color: "var(--ink)",
      borderColor: "transparent",
      width: "100%"
    }
  }, "Probar 14 d\xEDas gratis \u2192"))))));
}
Object.assign(window, {
  KitResults
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/juris-web/results.jsx", error: String((e && e.message) || e) }); }

// ui_kits/juris-web/sentence.jsx
try { (() => {
/* global React, KIcon */
function KitSentence({
  onNav,
  queryContext
}) {
  const {
    SourceChip,
    Badge,
    CitationRef,
    Tabs,
    Button
  } = window.JurisPEDesignSystem_cf0a1e;
  const d = window.KIT_DATA.sentence;
  const [tab, setTab] = React.useState("pdf");
  const [page, setPage] = React.useState(5);
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Vista de sentencia"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      top: 64,
      zIndex: 9,
      background: "color-mix(in srgb, var(--bg) 92%, transparent)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--line)",
      padding: "10px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container row",
    style: {
      gap: 8,
      fontSize: 12,
      color: "var(--ink-3)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav("landing"),
    className: "btn btn-sm btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--ink-3)"
    }
  }, "Inicio"), /*#__PURE__*/React.createElement("span", null, "\u203A"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav("search"),
    className: "btn btn-sm btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--ink-3)"
    }
  }, "Buscar: \"", queryContext, "\""), /*#__PURE__*/React.createElement("span", null, "\u203A"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--ink-2)",
      fontWeight: 500
    }
  }, d.ref), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(KIcon.doc, null)
  }, "Citar"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(KIcon.scales, null)
  }, "Comparar"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(KIcon.spark, null)
  }, "Resumir"))), /*#__PURE__*/React.createElement("header", {
    style: {
      padding: "var(--space-7) 0 var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container-narrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      marginBottom: 14,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(SourceChip, {
    source: "Tribunal Constitucional",
    year: "2024"
  }), /*#__PURE__*/React.createElement(Badge, null, d.tipo), /*#__PURE__*/React.createElement(Badge, {
    tone: "ok",
    dot: true
  }, d.estado), /*#__PURE__*/React.createElement(Badge, {
    tone: "bad"
  }, "Fallo: ", d.fallo)), /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      padding: "5px 10px",
      background: "var(--accent)",
      color: "#fff",
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 600
    }
  }, d.ref), /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 17,
      fontStyle: "italic",
      color: "var(--ink-2)"
    }
  }, d.caso)), /*#__PURE__*/React.createElement("h1", {
    className: "serif",
    style: {
      fontSize: 36,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
      margin: "0 0 var(--space-5)",
      textWrap: "balance",
      maxWidth: 820
    }
  }, d.title), /*#__PURE__*/React.createElement("div", {
    className: "row gap-5",
    style: {
      flexWrap: "wrap",
      color: "var(--ink-3)",
      fontSize: 13
    }
  }, [["Sala", d.sala], ["Fecha", d.fecha], ["Ponente", d.ponente], ["Páginas", d.pdfPages]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "col"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 2
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink)",
      fontWeight: 500
    }
  }, v)))))), /*#__PURE__*/React.createElement("div", {
    className: "container-narrow",
    style: {
      marginBottom: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-3",
    style: {
      padding: "12px 16px",
      background: "var(--accent-soft)",
      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(KIcon.spark, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      color: "var(--accent-ink)"
    }
  }, "Coincidencia encontrada en ", /*#__PURE__*/React.createElement("strong", null, "\xA71. Petitorio"), " (p\xE1gina 5)."), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement(KIcon.arrow, null)
  }, "Ir al p\xE1rrafo"))), /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "200px minmax(0,1fr) 340px",
      gap: "var(--space-6)",
      alignItems: "flex-start",
      paddingBottom: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      position: "sticky",
      top: 140
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 12
    }
  }, "\xCDndice"), /*#__PURE__*/React.createElement("nav", {
    className: "col",
    style: {
      gap: 2
    }
  }, d.toc.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: it.key,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "5px 8px",
      fontSize: 13,
      color: i === 0 ? "var(--accent)" : "var(--ink-2)",
      fontWeight: i === 0 ? 500 : 400,
      borderLeft: `2px solid ${i === 0 ? "var(--accent)" : "transparent"}`,
      marginLeft: -2,
      fontFamily: "var(--font-serif)"
    }
  }, /*#__PURE__*/React.createElement("span", null, it.label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-4)"
    }
  }, "p.", it.page)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      paddingTop: 18,
      borderTop: "1px solid var(--line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 10
    }
  }, "Magistrados"), /*#__PURE__*/React.createElement("div", {
    className: "col gap-2"
  }, d.magistrados.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.n,
    className: "col",
    style: {
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--ink)"
    }
  }, m.n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: m.v === "Voto singular" ? "var(--crimson)" : "var(--ink-3)"
    }
  }, m.v)))))), /*#__PURE__*/React.createElement("main", null, Object.values(d.sections).map(sec => /*#__PURE__*/React.createElement("section", {
    key: sec.title,
    style: {
      marginBottom: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 24,
      fontWeight: 500,
      margin: 0,
      letterSpacing: "-0.01em"
    }
  }, sec.title), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: "var(--ink-3)"
    }
  }, "p.", sec.page)), /*#__PURE__*/React.createElement("div", {
    className: "col gap-4"
  }, sec.paragraphs.map((p, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "serif",
    style: {
      fontSize: 17,
      lineHeight: 1.7,
      color: "var(--ink)",
      margin: 0,
      textAlign: "justify"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: "var(--ink-4)",
      fontSize: 12,
      marginRight: 8,
      verticalAlign: "2px"
    }
  }, i + 1, "."), p))))), /*#__PURE__*/React.createElement("section", {
    style: {
      marginBottom: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "serif",
    style: {
      fontSize: 22,
      fontWeight: 500,
      margin: "0 0 14px",
      letterSpacing: "-0.01em"
    }
  }, "Referencias citadas en esta sentencia"), /*#__PURE__*/React.createElement("div", {
    className: "col gap-2"
  }, d.citas.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.ref,
    className: "card",
    style: {
      padding: "14px 16px",
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 4,
      background: "var(--accent-soft)",
      color: "var(--accent-ink)",
      fontSize: 11,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, "\xD7", c.count), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "row gap-3"
  }, /*#__PURE__*/React.createElement(CitationRef, null, c.ref), /*#__PURE__*/React.createElement("span", {
    className: "serif",
    style: {
      fontSize: 13,
      fontStyle: "italic",
      color: "var(--ink-3)"
    }
  }, c.caso)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ink-2)",
      marginTop: 3
    }
  }, c.relevance)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost"
  }, "Abrir")))))), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: "sticky",
      top: 140
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    variant: "segmented",
    value: tab,
    onChange: setTab,
    style: {
      width: "100%",
      display: "flex"
    },
    items: [{
      value: "pdf",
      label: "PDF",
      icon: /*#__PURE__*/React.createElement(KIcon.doc, null)
    }, {
      value: "ask",
      label: "Pregunta",
      icon: /*#__PURE__*/React.createElement(KIcon.spark, null)
    }, {
      value: "notes",
      label: "Anotar"
    }]
  })), tab === "pdf" && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      padding: "10px 12px",
      background: "var(--bg)",
      borderBottom: "1px solid var(--line)",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    style: {
      padding: 4
    },
    onClick: () => setPage(Math.max(1, page - 1))
  }, "\u2039"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: "var(--ink-2)"
    }
  }, "p\xE1gina ", page, " / ", d.pdfPages), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    style: {
      padding: 4
    },
    onClick: () => setPage(Math.min(d.pdfPages, page + 1))
  }, "\u203A")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#e8e6df",
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fafaf6",
      aspectRatio: "1 / 1.414",
      padding: "28px 24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      fontFamily: "Times, serif",
      fontSize: 9,
      lineHeight: 1.5,
      color: "#222"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontSize: 8,
      fontWeight: 700,
      marginBottom: 4,
      letterSpacing: "0.1em"
    }
  }, "TRIBUNAL CONSTITUCIONAL DEL PER\xDA"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontSize: 7,
      color: "#666",
      marginBottom: 16
    }
  }, "EXP. N.\xB0 00061-2023-PHC/TC \xB7 LIMA"), page === 5 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      marginBottom: 6
    }
  }, "\xA71. PETITORIO"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      textAlign: "justify"
    }
  }, "1. El objeto de la presente demanda es que se declare la nulidad de la Resoluci\xF3n N.\xB0 18\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      margin: "0 0 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "-2%",
      top: "-3%",
      right: "-2%",
      bottom: "-3%",
      background: "color-mix(in srgb, var(--accent) 22%, transparent)",
      border: "1.5px solid var(--accent)",
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      position: "relative",
      textAlign: "justify"
    }
  }, "2. Se aduce que las resoluciones cuestionadas no estar\xEDan debidamente motivadas respecto de los presupuestos materiales requeridos para dictar la prisi\xF3n preventiva.")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      textAlign: "justify"
    }
  }, "3. Espec\xEDficamente, se sostiene que no existen graves y fundados elementos de convicci\xF3n\u2026")) : Array.from({
    length: 22
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: 6,
      marginBottom: 6,
      background: "#d8d6cd",
      width: i % 6 === 5 ? "65%" : "100%"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px",
      fontSize: 11,
      color: "var(--ink-3)",
      borderTop: "1px solid var(--line)"
    },
    className: "row gap-2"
  }, /*#__PURE__*/React.createElement(KIcon.shield, null), /*#__PURE__*/React.createElement("span", null, "Sello digital verificado"))), tab === "ask" && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(KIcon.spark, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Pregunta a esta sentencia")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink-3)",
      marginBottom: 14
    }
  }, "Respuestas con cita al p\xE1rrafo exacto."), /*#__PURE__*/React.createElement("div", {
    className: "col gap-2"
  }, ["¿Qué fundamento usó el TC para declarar infundada la demanda?", "¿Cuáles son los tres presupuestos del art. 268 CPP?", "Resume el test de proporcionalidad aplicado"].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    style: {
      textAlign: "left",
      padding: "9px 11px",
      background: "var(--bg-elev)",
      border: "1px solid var(--line)",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 13,
      color: "var(--ink-2)",
      fontFamily: "var(--font-serif)",
      lineHeight: 1.4
    }
  }, s)))), tab === "notes" && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row gap-2",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Mis anotaciones")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: "var(--bg)",
      borderRadius: 6,
      borderLeft: "2px solid var(--gold)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 10,
      color: "var(--ink-3)",
      marginBottom: 4
    }
  }, "\xA72 fund. 7"), /*#__PURE__*/React.createElement("div", {
    className: "serif",
    style: {
      fontSize: 13,
      color: "var(--ink)",
      lineHeight: 1.45
    }
  }, "Test de proporcionalidad bien aplicado. \xDAtil para apelaci\xF3n caso L\xF3pez.")))))));
}
Object.assign(window, {
  KitSentence
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/juris-web/sentence.jsx", error: String((e && e.message) || e) }); }

__ds_ns.CitationRef = __ds_scope.CitationRef;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.SourceChip = __ds_scope.SourceChip;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ResultCard = __ds_scope.ResultCard;

__ds_ns.SearchBar = __ds_scope.SearchBar;

__ds_ns.SynthesisCallout = __ds_scope.SynthesisCallout;

})();
