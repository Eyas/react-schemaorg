import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Person, WithContext } from "schema-dts";
import { JsonLd } from "../src";

test("works", () => {
  expect(
    renderToStaticMarkup(
      <JsonLd<Person>
        item={{
          "@context": "https://schema.org",
          "@type": "Person",
        }}
      />,
    ),
  ).toMatchInlineSnapshot(
    `"<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person"}</script>"`,
  );
});

test("escapes JSON-LD-illegal chars in values", () => {
  expect(
    renderToStaticMarkup(
      <JsonLd<Person>
        item={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Foo</script>",
        }}
      />,
    ),
  ).toMatchInlineSnapshot(
    `"<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Foo\\u003c/script\\u003e"}</script>"`,
  );
});

test("escapes JSON-LD-illegal chars in object keys", () => {
  const scriptTag = "</script><script>alert('test')</script>";
  const item = {
    "@context": "https://schema.org",
    "@type": "Person",
    [scriptTag]: "some value",
  } as unknown as WithContext<Person>;

  const html = renderToStaticMarkup(<JsonLd<Person> item={item} />);
  expect(html).toMatchInlineSnapshot(
    `"<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","\\u003c/script\\u003e\\u003cscript\\u003ealert('test')\\u003c/script\\u003e":"some value"}</script>"`,
  );
  // Only the single closing </script> tag at the end should be present.
  expect(html.match(/<\/script>/gi)).toEqual(["</script>"]);
});

test("ignores invalid or inherited space on JsonLd component", () => {
  const item: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Alice",
  };
  const expected = `<script type="application/ld+json">${JSON.stringify(item)}</script>`;

  expect(
    renderToStaticMarkup(<JsonLd<Person> item={item} space={'"@type":1,'} />),
  ).toBe(expected);

  const proto = Object.prototype as Record<string, unknown>;
  proto.space = '"@id":0,';
  try {
    expect(renderToStaticMarkup(<JsonLd<Person> item={item} />)).toBe(expected);
  } finally {
    delete proto.space;
  }
});
