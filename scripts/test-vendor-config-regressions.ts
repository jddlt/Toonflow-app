import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  replaceVendorModel,
  appendVendorModel,
  removeVendorModel,
  mergeVendorModels,
  parseStoredVendorModels,
  serializeStoredVendorModels,
} from "../src/utils/vendorModelStore";

const textModel = (name: string, modelName: string, think = false) => ({
  name,
  modelName,
  type: "text" as const,
  think,
});

function testModelStore() {
  const initial = [
    textModel("Claude Sonnet 4.5", "claude-sonnet-4-5"),
    textModel("Gemini 3.1 Pro Preview", "gemini-3.1-pro-preview", true),
  ];

  const replaced = replaceVendorModel(initial, "gemini-3.1-pro-preview", textModel("Gemini 3.1 Pro", "gemini-3.1-pro", true));
  assert.deepEqual(
    replaced.map((item) => item.modelName),
    ["claude-sonnet-4-5", "gemini-3.1-pro"],
    "editing a model should replace the matching item instead of overwriting the first different one",
  );

  const appended = appendVendorModel(replaced, textModel("GPT-4.1", "gpt-4.1"));
  assert.deepEqual(
    appended.map((item) => item.modelName),
    ["claude-sonnet-4-5", "gemini-3.1-pro", "gpt-4.1"],
    "adding a model should append a new unique item",
  );

  const removed = removeVendorModel(appended, "claude-sonnet-4-5");
  assert.deepEqual(
    mergeVendorModels([], removed).map((item) => item.modelName),
    ["gemini-3.1-pro", "gpt-4.1"],
    "deleting a stored model should hide it from the merged model list",
  );
  assert.deepEqual(
    removed.filter((item) => item.deleted).map((item) => item.modelName),
    ["claude-sonnet-4-5"],
    "deleting a model should persist a deletion marker",
  );

  assert.deepEqual(
    mergeVendorModels(
      [textModel("Built-in Claude", "claude-sonnet-4-5"), textModel("Built-in Gemini", "gemini-3.1-pro", true)],
      removed,
    ).map((item) => item.modelName),
    ["gemini-3.1-pro", "gpt-4.1"],
    "deleting a model should also hide the built-in version with the same model name",
  );

  const serialized = serializeStoredVendorModels(appended);
  assert.deepEqual(
    parseStoredVendorModels(serialized).map((item) => item.modelName),
    ["claude-sonnet-4-5", "gemini-3.1-pro", "gpt-4.1"],
    "stored models should round-trip without duplicates or ghost entries",
  );

  const deduped = parseStoredVendorModels(
    JSON.stringify([
      textModel("Gemini Old", "gemini-3.1-pro-preview"),
      textModel("Gemini New", "gemini-3.1-pro-preview", true),
      textModel("Claude Sonnet 4.5", "claude-sonnet-4-5"),
    ]),
  );
  assert.deepEqual(
    deduped.map((item) => item.name),
    ["Gemini New", "Claude Sonnet 4.5"],
    "duplicate stored models should collapse to the latest value",
  );

  const mergedWithMetadata = mergeVendorModels(
    [
      {
        ...textModel("Gemini 3.0 Pro Image", "gemini-3.0-pro-image"),
        allowedInputTypes: ["text", "image_url"],
        supportedResolutions: ["1024x1024"],
      },
    ],
    [
      {
        name: "Gemini 3.0 Pro Image",
        modelName: "gemini-3.0-pro-image",
        type: "image",
        mode: ["text", "singleImage", "multiReference"],
      },
    ],
  );
  assert.deepEqual(
    mergedWithMetadata[0].allowedInputTypes,
    ["text", "image_url"],
    "stored model overlays should preserve built-in metadata fields when the override omits them",
  );

  const builtInModels = [
    textModel("Built-in Gemini", "gemini-3.1-pro-preview", true),
    textModel("Built-in Claude", "claude-sonnet-4-5"),
  ];
  const deletionMarkers = removeVendorModel([], "gemini-3.1-pro-preview");
  assert.deepEqual(
    mergeVendorModels(builtInModels, deletionMarkers).map((item) => item.modelName),
    ["claude-sonnet-4-5"],
    "deleting a built-in model should hide it from the merged model list",
  );

  assert.deepEqual(
    appendVendorModel(deletionMarkers, textModel("Gemini Restored", "gemini-3.1-pro-preview", true)).map((item) => item.modelName),
    ["gemini-3.1-pro-preview"],
    "re-adding a deleted model should clear its deletion marker",
  );
}

function testNullVendorTemplate() {
  const source = fs.readFileSync(path.join(process.cwd(), "data/vendor/null.ts"), "utf8");
  assert.match(source, /createOpenAICompatible\(/, "generic null vendor should use the OpenAI-compatible factory for custom gateways");
  assert.match(source, /\.chatModel\(model\.modelName\)/, "generic null vendor should construct chat models with chatModel()");
  assert.doesNotMatch(source, /createOpenAI\(\{ baseURL: vendor\.inputValues\.baseUrl, apiKey \}\)\.chat\(model\.modelName\)/, "generic null vendor should not hard-code the OpenAI provider for arbitrary gateways");
}

function testUpdateCodeRoute() {
  const source = fs.readFileSync(path.join(process.cwd(), "src/routes/setting/vendorConfig/updateCode.ts"), "utf8");
  assert.doesNotMatch(
    source,
    /models:\s*JSON\.stringify\(vendor\.models \?\? \[\]\)/,
    "saving vendor code should not overwrite the stored custom model list",
  );
}

function main() {
  testModelStore();
  testNullVendorTemplate();
  testUpdateCodeRoute();
  console.log("vendor config regressions: ok");
}

main();
