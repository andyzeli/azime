const fs = require("fs");
const data = require("../docs/ama-spine.upload.json");

const canonicalMap = data.map((item) => ({
  row_id: item.row_id,
  region_id: item.region_id,
  description: item.description,
}));

fs.writeFileSync("../docs/canonical-map.json", JSON.stringify(canonicalMap));
