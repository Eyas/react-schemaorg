import * as React from "react";
import { JsonLd } from "../src";
import { Person } from "schema-dts";
import { create } from "react-test-renderer";

test("works", () => {
  expect(
    create(
      <JsonLd<Person>
        item={{
          "@context": "https://schema.org",
          "@type": "Person",
        }}
      />,
    ).toJSON(),
  ).toMatchInlineSnapshot(`null`);
});

test("escapes JSON-LD-illegal chars", () => {
  expect(
    create(
      <JsonLd<Person>
        item={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Foo</script>",
        }}
      />,
    ).toJSON(),
  ).toMatchInlineSnapshot(`null`);
});
