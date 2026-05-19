const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "..", "node_modules", "@salutejs", "client", "esm", "createAssistantDevOrigin.js"),
  path.join(__dirname, "..", "node_modules", "@salutejs", "client", "dist", "createAssistantDevOrigin.js"),
];

const unsafe = "owner: event.appInfo.applicationId === (appInfo === null || appInfo === void 0 ? void 0 : appInfo.applicationId)";
const safe =
  "owner: ((event.appInfo === null || event.appInfo === void 0 ? void 0 : event.appInfo.applicationId) === (appInfo === null || appInfo === void 0 ? void 0 : appInfo.applicationId))";

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(unsafe) || source.includes(safe)) {
    continue;
  }

  fs.writeFileSync(file, source.replace(unsafe, safe));
  console.log(`[patch-salutejs-client] patched ${path.relative(process.cwd(), file)}`);
}
