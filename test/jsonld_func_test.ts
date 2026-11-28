import { Person, WithContext } from "schema-dts";

import { helmetJsonLdProp, jsonLdScriptProps } from "../src";

test("works", () => {
  expect(
    helmetJsonLdProp<Person>({
      "@context": "https://schema.org",
      "@type": "Person",
    }),
  ).toMatchInlineSnapshot(`
   {
     "innerHTML": "{"@context":"https://schema.org","@type":"Person"}",
     "type": "application/ld+json",
   }
  `);

  expect(
    jsonLdScriptProps<Person>({
      "@context": "https://schema.org",
      "@type": "Person",
    }),
  ).toMatchInlineSnapshot(`
   {
     "dangerouslySetInnerHTML": {
       "__html": "{"@context":"https://schema.org","@type":"Person"}",
     },
     "type": "application/ld+json",
   }
  `);

  expect(
    jsonLdScriptProps<Person>(
      {
        "@context": "https://schema.org",
        "@type": "Person",
      },
      /* options=*/ {},
    ),
  ).toMatchInlineSnapshot(`
   {
     "dangerouslySetInnerHTML": {
       "__html": "{"@context":"https://schema.org","@type":"Person"}",
     },
     "type": "application/ld+json",
   }
  `);

  expect(
    jsonLdScriptProps<Person>(
      {
        "@context": "https://schema.org",
        "@type": "Person",
      },
      /* options=*/ { space: 2 },
    ),
  ).toMatchInlineSnapshot(`
   {
     "dangerouslySetInnerHTML": {
       "__html": "{
     "@context": "https://schema.org",
     "@type": "Person"
   }",
     },
     "type": "application/ld+json",
   }
  `);
});

test("escapes JSON-LD-illegal chars", () => {
  expect(
    helmetJsonLdProp<Person>({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Foo</script>",
    }),
  ).toMatchInlineSnapshot(`
   {
     "innerHTML": "{"@context":"https://schema.org","@type":"Person","name":"Foo\\u003c/script\\u003e"}",
     "type": "application/ld+json",
   }
  `);

  expect(
    jsonLdScriptProps<Person>({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Foo</script>",
    }),
  ).toMatchInlineSnapshot(`
   {
     "dangerouslySetInnerHTML": {
       "__html": "{"@context":"https://schema.org","@type":"Person","name":"Foo\\u003c/script\\u003e"}",
     },
     "type": "application/ld+json",
   }
  `);
});

test("escapes JSON-LD-illegal chars with nested objects and space", () => {
  expect(
    helmetJsonLdProp<Person>(
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: ["Foo</script>", null!, undefined!],
        alternateName: null!,
        knows: [],
        knowsAbout: {
          "@type": "CreativeWork",
          name: "Foo",
          copyrightYear: 2020,
        },
      },
      { space: 2 },
    ),
  ).toMatchInlineSnapshot(`
   {
     "innerHTML": "{
     "@context": "https://schema.org",
     "@type": "Person",
     "name": [
       "Foo\\u003c/script\\u003e",
       null,
       null
     ],
     "knows": [],
     "knowsAbout": {
       "@type": "CreativeWork",
       "name": "Foo",
       "copyrightYear": 2020
     }
   }",
     "type": "application/ld+json",
   }
  `);

  expect(
    jsonLdScriptProps<Person>(
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: ["Foo</script>", null!, undefined!],
        alternateName: null!,
        knows: [],
        knowsAbout: {
          "@type": "CreativeWork",
          name: "Foo",
          copyrightYear: 2020,
        },
      },
      { space: 2 },
    ),
  ).toMatchInlineSnapshot(`
   {
     "dangerouslySetInnerHTML": {
       "__html": "{
     "@context": "https://schema.org",
     "@type": "Person",
     "name": [
       "Foo\\u003c/script\\u003e",
       null,
       null
     ],
     "knows": [],
     "knowsAbout": {
       "@type": "CreativeWork",
       "name": "Foo",
       "copyrightYear": 2020
     }
   }",
     },
     "type": "application/ld+json",
   }
  `);
});

function bothOutputs(
  item: Parameters<typeof jsonLdScriptProps>[0],
  options?: Parameters<typeof jsonLdScriptProps>[1],
): [string, string] {
  const scriptHtml = jsonLdScriptProps(item, options).dangerouslySetInnerHTML!
    .__html as string;
  const helmetHtml = helmetJsonLdProp(
    item as Parameters<typeof helmetJsonLdProp>[0],
    options,
  ).innerHTML;
  return [scriptHtml, helmetHtml];
}

test("escapes JSON-LD-illegal chars in object keys (top-level, nested, Graph, null-proto, __proto__)", () => {
  const scriptTag = "</script><script>alert('test')</script>";
  const nullProto = Object.create(null);
  nullProto[scriptTag] = "null-proto value";
  const withOwnProto = JSON.parse(
    `{"__proto__":{${JSON.stringify(scriptTag)}:"own proto"}}`,
  );

  const item = {
    "@context": "https://schema.org",
    "@type": "Person",
    [scriptTag]: "some value",
    nested: {
      [scriptTag]: "nested value",
    },
    nullProto,
    withOwnProto,
  } as unknown as WithContext<Person>;

  for (const html of bothOutputs(item)) {
    expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF]/);
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html)).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      [scriptTag]: "some value",
      nested: {
        [scriptTag]: "nested value",
      },
      nullProto: { [scriptTag]: "null-proto value" },
      withOwnProto,
    });
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [{ "@type": "Person", [scriptTag]: "in graph" }],
  } as unknown as Parameters<typeof jsonLdScriptProps>[0];
  for (const html of bothOutputs(graph)) {
    expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF]/);
    expect(JSON.parse(html)).toEqual(graph);
  }
});

test("preserves RFC 8259 round-trip fidelity for HTML, URLs, quotes, backslashes, line separators, XML noncharacters, and emojis", () => {
  const tricky =
    '\\</script> </SCRIPT> <!-- <script> --> ]]> https://example.com/?a=1&b=2 O\'Brien "Bob" \u2028 \u2029 \uFFFE \uFFFF 😀 \\\\<';
  const item: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: tricky,
    url: "https://example.com/?a=1&b=2",
  };

  for (const html of bothOutputs(item)) {
    expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF]/);
    expect(html).toContain("😀");
    expect(JSON.parse(html)).toEqual(item);
  }
});

test("escapes boxed String, toJSON, Proxy, and JSON.rawJSON (including lone surrogates)", () => {
  const scriptTag = "</script><script>alert('test')</script>";

  const boxedItem = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: new String(scriptTag),
  } as unknown as WithContext<Person>;
  for (const html of bothOutputs(boxedItem)) {
    expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF]/);
    expect(JSON.parse(html)).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      name: scriptTag,
    });
  }

  const toJsonItem = {
    "@context": "https://schema.org",
    "@type": "Person",
    knowsAbout: {
      toJSON() {
        return { [scriptTag]: "via toJSON" };
      },
    },
  } as unknown as WithContext<Person>;
  for (const html of bothOutputs(toJsonItem)) {
    expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF]/);
    expect(JSON.parse(html)).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      knowsAbout: { [scriptTag]: "via toJSON" },
    });
  }

  const proxyItem = new Proxy(
    { "@context": "https://schema.org", "@type": "Person" },
    {
      ownKeys: () => ["@context", "@type", scriptTag],
      getOwnPropertyDescriptor: () => ({
        enumerable: true,
        configurable: true,
      }),
      get: (target, prop) =>
        prop === scriptTag ? scriptTag : target[prop as keyof typeof target],
    },
  ) as unknown as WithContext<Person>;
  for (const html of bothOutputs(proxyItem)) {
    expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF]/);
    expect(JSON.parse(html)).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      [scriptTag]: scriptTag,
    });
  }

  const jsonWithRaw = JSON as typeof JSON & {
    rawJSON?: (text: string) => unknown;
  };
  if (typeof jsonWithRaw.rawJSON === "function") {
    const rawItem = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: jsonWithRaw.rawJSON(JSON.stringify(scriptTag)),
      loneSurrogate: jsonWithRaw.rawJSON('"\ud800"'),
    } as unknown as WithContext<Person>;
    for (const html of bothOutputs(rawItem)) {
      expect(html).not.toMatch(/[<>&\u2028\u2029\uFFFE\uFFFF\uD800-\uDFFF]/);
      expect(html).toContain("\\ud800");
      expect(JSON.parse(html)).toEqual({
        "@context": "https://schema.org",
        "@type": "Person",
        name: scriptTag,
        loneSurrogate: "\ud800",
      });
    }
  }
});

test("normalizes options.space to strict RFC 8259 whitespace and own properties", () => {
  const item: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "ok",
  };

  // Valid whitespace and finite numbers work as expected.
  for (const html of bothOutputs(item, { space: "\t" })) {
    expect(html).toContain('\n\t"@context"');
    expect(JSON.parse(html)).toEqual(item);
  }
  for (const html of bothOutputs(item, { space: 20 })) {
    expect(html).toContain('\n          "@context"');
    expect(JSON.parse(html)).toEqual(item);
  }
  for (const html of bothOutputs(item, { space: 0 })) {
    expect(html).toBe(JSON.stringify(item));
  }

  // Non-whitespace or non-finite space values fall back to compact RFC 8259 JSON.
  const invalidSpaces: unknown[] = [
    "</script><",
    '"@type":1,',
    '"url":"",',
    "\x01\x0b\x0c\x1f",
    "\u00A0",
    "\u2028",
    "\uD800",
    "         \uD83D\uDE00",
    new String('"@id":0,'),
    new Number(2),
    NaN,
    Infinity,
    -Infinity,
    true,
  ];
  for (const badSpace of invalidSpaces) {
    for (const html of bothOutputs(item, { space: badSpace as string })) {
      expect(html).toBe(JSON.stringify(item));
      expect(JSON.parse(html)).toEqual(item);
    }
  }

  // Null / primitive / null-prototype options do not crash or misbehave.
  for (const html of bothOutputs(item, null as unknown as { space?: number })) {
    expect(html).toBe(JSON.stringify(item));
  }
  const nullProtoOpts = Object.create(null);
  nullProtoOpts.space = 2;
  for (const html of bothOutputs(item, nullProtoOpts)) {
    expect(html).toContain('\n  "@context"');
  }

  // Inherited Object.prototype.space is ignored.
  const proto = Object.prototype as Record<string, unknown>;
  proto.space = '"@id":0,';
  try {
    for (const html of bothOutputs(item)) {
      expect(html).toBe(JSON.stringify(item));
      expect(JSON.parse(html)).toEqual(item);
    }
    for (const html of bothOutputs(item, {})) {
      expect(html).toBe(JSON.stringify(item));
      expect(JSON.parse(html)).toEqual(item);
    }
  } finally {
    delete proto.space;
  }
});

test("handles non-serializable root values safely", () => {
  expect(
    jsonLdScriptProps<Person>(null as unknown as WithContext<Person>)
      .dangerouslySetInnerHTML!.__html,
  ).toBe("");
  expect(
    helmetJsonLdProp<Person>(undefined as unknown as WithContext<Person>)
      .innerHTML,
  ).toBe("");
});
