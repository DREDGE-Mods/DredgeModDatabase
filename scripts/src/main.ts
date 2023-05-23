const core = require("@actions/core");
import mod_list from "../../mods.json";
const fetch = require("node-fetch");
const fs = require("fs");

async function run() {
    core.info("Started updating mod database");

    var promises : Array<Promise<any>> = [];

    mod_list.mods.forEach((mod) => {
        core.info("Found mod : " + mod.name);
        let promise = getModInfo(mod)
        .then((x) => {
            core.info("Got mod info for " + mod.name);
            return x;
        })
        .catch((error) => {
            core.info("Couldn't load mod " + mod.name + " " + error.message);
            return mod;
        })
        promises.push(promise);
    });

    Promise.all(promises).then((results) => {
        let json = JSON.stringify(results, null, 2);
        core.info(json);
        fs.writeFile("database.json", json, 'utf8', (err : Error) => {
            if (err) {
                throw new Error(err.message);
            }
            else {
                core.info("Saved updated database");
            }
        });
        core.info("Saved database.json to " + process.cwd());
    });
}

async function getModInfo(mod : ModInfo) {
    // Get data from API
    let json = await fetch_json("https://api.github.com/repos/" + mod.repo);

    // Get tags data
    let tagJson = await fetch_json("https://api.github.com/repos/" + mod.repo + "/tags");

    // Get download count
    var download_count = 0;
    let releasesJson = await fetch_json("https://api.github.com/repos/" + mod.repo + "/releases");
    releasesJson.forEach((x : any) => {
        x.assets.forEach((y : any) => {
            download_count += y.download_count;
        })
    });

    let databaseJson : DatabaseModInfo = {
        name : mod.name,
        mod_guid : mod.mod_guid,
        repo : mod.repo,
        download : mod.download,
        description : json.description,
        release_date : json.created_at,
        latest_version: tagJson[0].name,
        downloads: download_count
    }
    
    return databaseJson;
}

async function fetch_json(url : string) {
    let settings = {method: "GET"};
    let res = await fetch(url, settings);
    let json = await res.json();

    if (json.hasOwnProperty("message") && (json["message"] as string).includes("API rate limit exceeded")) {
        throw new Error(json["message"]);
    }

    return json;
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
