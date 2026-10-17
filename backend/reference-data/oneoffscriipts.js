import fs from "fs";
// import data from "./canonical_diagnoses.json" assert { type: "json" };

// const withT = data.map((item) => ({
//   ...item,
//   ama_rating_table_ids: [],
// }));

// fs.writeFileSync("./canonical_diagnoses_updated.json", JSON.stringify(withT));


import data from "../reference-data/ama-rating-tables/cnstables.json" assert { type: "json" };

const names = data.map((item) => item.table_id);
console.log(names);