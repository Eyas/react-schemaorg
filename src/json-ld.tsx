/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from "react";
import type { JSX } from "react";
import type { Thing, WithContext, Graph } from "schema-dts";

interface JsonLdOptions {
  /** Adds indentation, white space, and line break characters to JSON-LD output. {@link JSON.stringify} */
  space?: string | number;
}

/**
 * Component that inline-includes a JSON-LD script where specified.
 *
 * For Example:
 *
 * ```tsx
 * <JsonLd<Person>
 *   item={{
 *     "@context": "https://schema.org",
 *     "@type": "Person",
 *     name: "Grace Hopper",
 *     alternateName: "Grace Brewster Murray Hopper",
 *     alumniOf: {
 *       "@type": "CollegeOrUniversity",
 *       name: ["Yale University", "Vassar College"]
 *     },
 *     knowsAbout: ["Compilers", "Computer Science"]
 *   }}
 *   space={2}
 * />
 * ```
 */
export function JsonLd(props: JsonLdOptions & { item: Graph }): JSX.Element;
export function JsonLd<T extends Thing>(
  props: JsonLdOptions & { item: WithContext<T> },
): JSX.Element;
export function JsonLd(
  props: JsonLdOptions & { item: Graph | WithContext<Thing> },
) {
  return <script {...jsonLdScriptProps(props.item, props)} />;
}

/**
 * Produces necessary props for a JSX <script> tag that includes JSON-LD.
 *
 * Can be used by spreading the props into a <script> JSX tag:
 *
 * ```tsx
 * <script {...jsonLdScriptProps<Person>({
 *   "@context": "https://schema.org",
 *   "@type": "Person",
 *   name: "Grace Hopper",
 *   alternateName: "Grace Brewster Murray Hopper",
 *   alumniOf: {
 *     "@type": "CollegeOrUniversity",
 *     name: ["Yale University", "Vassar College"]
 *   },
 *   knowsAbout: ["Compilers", "Computer Science"]
 * })} />
 * ```
 */
export function jsonLdScriptProps(
  item: Graph,
  options?: JsonLdOptions,
): JSX.IntrinsicElements["script"];
export function jsonLdScriptProps<T extends Thing>(
  item: WithContext<T>,
  options?: JsonLdOptions,
): JSX.IntrinsicElements["script"];
export function jsonLdScriptProps(
  item: Graph | WithContext<Thing>,
  options?: JsonLdOptions,
): JSX.IntrinsicElements["script"];
export function jsonLdScriptProps(
  item: Graph | WithContext<Thing>,
  options?: JsonLdOptions,
): JSX.IntrinsicElements["script"] {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: serializeJsonLd(item, options),
    },
  };
}

/**
 * Produces a Helmet-style <script> prop for a given JSON-LD datum.
 *
 * For example:
 *
 * ```tsx
 * <Helmet script={[
 *     helmetJsonLdProp<Person>({
 *         "@context": "https://schema.org",
 *         "@type": "Person",
 *         name: "Grace Hopper",
 *         alternateName: "Grace Brewster Murray Hopper",
 *         alumniOf: {
 *           "@type": "CollegeOrUniversity",
 *           name: ["Yale University", "Vassar College"]
 *         },
 *         knowsAbout: ["Compilers", "Computer Science"]
 *     }),
 * ]} />
 * ```
 */
export function helmetJsonLdProp(
  item: Graph,
  options?: JsonLdOptions,
): {
  type: "application/ld+json";
  innerHTML: string;
};
export function helmetJsonLdProp<T extends Thing>(
  item: WithContext<T>,
  options?: JsonLdOptions,
): {
  type: "application/ld+json";
  innerHTML: string;
};
export function helmetJsonLdProp(
  item: WithContext<Thing> | Graph,
  options?: JsonLdOptions,
): {
  type: "application/ld+json";
  innerHTML: string;
} {
  return {
    type: "application/ld+json" as const,
    innerHTML: serializeJsonLd(item, options),
  };
}

const ESCAPE_CHARS: Readonly<Record<string, string | undefined>> =
  Object.freeze(
    Object.assign(Object.create(null), {
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029",
      "\uFFFE": "\\ufffe",
      "\uFFFF": "\\uffff",
    }),
  );
const ESCAPE_REGEX =
  /[\uD800-\uDBFF][\uDC00-\uDFFF]|[<>&\u2028\u2029\uFFFE\uFFFF\uD800-\uDFFF]/g;
const ESCAPE_REPLACER = (ch: string): string => {
  if (ch.length === 2) {
    return ch;
  }
  return (
    ESCAPE_CHARS[ch] || `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
};

const JSON_WHITESPACE_REGEX = /^[ \t\r\n]*$/;

/**
 * Extracts a safe, RFC 8259-compliant `space` value from own properties of
 * `options`, ignoring inherited properties, boxed primitives, non-finite
 * numbers, and non-whitespace strings.
 */
function normalizeSpace(options?: JsonLdOptions): string | number | undefined {
  if (
    options == null ||
    typeof options !== "object" ||
    !Object.prototype.hasOwnProperty.call(options, "space")
  ) {
    return undefined;
  }
  const { space } = options;
  if (typeof space === "number") {
    return Number.isFinite(space)
      ? Math.min(10, Math.max(0, Math.trunc(space)))
      : undefined;
  }
  if (typeof space === "string") {
    const truncated = space.slice(0, 10);
    return JSON_WHITESPACE_REGEX.test(truncated) ? truncated : undefined;
  }
  return undefined;
}

/**
 * A replacer for JSON.stringify that omits null object properties
 * (while preserving JSON.stringify's standard behavior for arrays).
 */
function omitNullReplacer(_key: string, value: unknown): unknown {
  return value === null ? undefined : value;
}

/**
 * Serializes JSON-LD into valid RFC 8259 JSON safe for embedding inside
 * HTML/XHTML `<script type="application/ld+json">` elements.
 *
 * Escapes `<`, `>`, `&`, U+2028, U+2029, XML-illegal noncharacters
 * (U+FFFE/U+FFFF), and unpaired UTF-16 surrogates on the serialized JSON
 * string using standard JSON Unicode escapes (`\uXXXX`) so markup sequences
 * like `</script>`, `<!--`, `-->`, or `]]>` cannot appear anywhere in the
 * output (including in object keys, boxed strings, or `JSON.rawJSON()` values)
 * while still decoding losslessly via `JSON.parse()`.
 */
function serializeJsonLd(
  item: Graph | WithContext<Thing>,
  options?: JsonLdOptions,
): string {
  const json = JSON.stringify(item, omitNullReplacer, normalizeSpace(options));
  if (json === undefined) {
    return "";
  }
  return json.replace(ESCAPE_REGEX, ESCAPE_REPLACER);
}
