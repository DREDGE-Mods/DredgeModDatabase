const core = require("@actions/core");
import mod_list from "../../mods.json";
const fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";

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
            throw new Error("Aborting database update - Couldn't load mod " + mod.name + ": " + error.message);
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
    releasesJson.forEach((release : any) => {
        release.assets.forEach((asset : { name : string, download_count : number }) => {
            if (asset.name == mod.download) {
                download_count += asset.download_count;
            }
        })
    });
    let asset_update_date = releasesJson[0].assets.filter((x : { name : string }) => x.name == mod.download)[0].updated_at;

    let default_branch = json.default_branch;

    let databaseJson : DatabaseModInfo = {
        name : mod.name,
        mod_guid : mod.mod_guid,
        repo : mod.repo,
        download : mod.download,
        author : !is_empty(mod.author) ? mod.author : mod.repo.split("/")[0],
        description : !is_empty(mod.description) ? mod.description : json.description,
        release_date : json.created_at,
        asset_update_date : asset_update_date,
        latest_version: tagJson[0].name,
        downloads: download_count,
        readme_url: "https://github.com/" + mod.repo + "/blob/" + default_branch + "/README.md",
        readme_raw: "https://raw.githubusercontent.com/" + mod.repo + "/" + default_branch + "/README.md"
    }
    
    return databaseJson;
}

async function fetch_json(url : string) {
    let settings = {
        method: "GET",
        authorization: `Bearer ${process.env["GITHUB_TOKEN"]}`
    }

    let res = await fetch(url, settings);
    let json = await res.json();

    if (json.hasOwnProperty("message") && (json["message"] as string).includes("API rate limit exceeded")) {
        throw new Error(json["message"]);
    }

    return json;
}

function is_empty(s : string | undefined) {
    return s == null || s.length == 0;
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
