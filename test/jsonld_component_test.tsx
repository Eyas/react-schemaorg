import * as React from "react";
import { JsonLd } from "../src";
import { Person, WithContext } from "schema-dts";
import {
  act,
  create,
  ReactTestRenderer,
  ReactTestRendererJSON,
} from "react-test-renderer";

(
  global as typeof global & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderJson(element: React.ReactElement): ReactTestRendererJSON {
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer!.toJSON() as ReactTestRendererJSON;
}

test("works", () => {
  expect(
    renderJson(
      <JsonLd<Person>
        item={{
          "@context": "https://schema.org",
          "@type": "Person",
        }}
      />,
    ),
  ).toMatchInlineSnapshot(`
   <script
     dangerouslySetInnerHTML={
       {
         "__html": "{"@context":"https://schema.org","@type":"Person"}",
       }
     }
     type="application/ld+json"
   />
  `);
});

test("escapes JSON-LD-illegal chars in values", () => {
  expect(
    renderJson(
      <JsonLd<Person>
        item={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Foo</script>",
        }}
      />,
    ),
  ).toMatchInlineSnapshot(`
   <script
     dangerouslySetInnerHTML={
       {
         "__html": "{"@context":"https://schema.org","@type":"Person","name":"Foo\\u003c/script\\u003e"}",
       }
     }
     type="application/ld+json"
   />
  `);
});

test("escapes JSON-LD-illegal chars in object keys", () => {
  const scriptTag = "</script><script>alert('test')</script>";
  const item = {
    "@context": "https://schema.org",
    "@type": "Person",
    [scriptTag]: "some value",
  } as unknown as WithContext<Person>;

  expect(renderJson(<JsonLd<Person> item={item} />)).toMatchInlineSnapshot(`
   <script
     dangerouslySetInnerHTML={
       {
         "__html": "{"@context":"https://schema.org","@type":"Person","\\u003c/script\\u003e\\u003cscript\\u003ealert('test')\\u003c/script\\u003e":"some value"}",
       }
     }
     type="application/ld+json"
   />
  `);
});

test("ignores invalid or inherited space on JsonLd component", () => {
  const item: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Alice",
  };
  const renderedBadSpace = renderJson(
    <JsonLd<Person> item={item} space={'"@type":1,'} />,
  );
  expect(renderedBadSpace.props.dangerouslySetInnerHTML.__html).toBe(
    JSON.stringify(item),
  );

  const proto = Object.prototype as Record<string, unknown>;
  proto.space = '"@id":0,';
  try {
    const renderedInherited = renderJson(<JsonLd<Person> item={item} />);
    expect(renderedInherited.props.dangerouslySetInnerHTML.__html).toBe(
      JSON.stringify(item),
    );
  } finally {
    delete proto.space;
  }
});
