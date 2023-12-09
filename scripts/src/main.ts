const core = require("@actions/core");
import mod_list from "../../mods.json";
const fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";
import { generateModThumbnail } from "./create-thumbnail";

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
    // For mods that changed their zip name, we keep an old tally for the previous download count since it checks by the file name
    var download_count = mod.downloads_offset ?? 0;
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

    let repo_root = "https://raw.githubusercontent.com/" + mod.repo + "/" + default_branch;
    let readme_raw = repo_root + "/README.md"

    // Get the first image in the readme, if there is one, but make sure it isn't from img.shields.io
    let readme_plain_text = await fetch_text(readme_raw);
    let imageRegex = /(!\[.*\]\(.*)\)/g
    var imageResults = readme_plain_text.match(imageRegex);
    let first_image : string = "";
    if (imageResults != null) {
        for (let i = 0; i < imageResults.length; i++) {
            var image = imageResults[i]
            console.log(mod.name + " " + i + " " + image)
            if (!image.includes("img.shields.io")) {
                // Extract just the url from it
                var first_image_match = image.match(/(!\[.*\]\()(.*)\)/);
                if (first_image_match != null) {
                    let image_url = fix_url(first_image_match[2], repo_root)
                    first_image = await generateModThumbnail(mod.name, image_url)
                }
                break;
            }
        }
    }


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
        readme_raw: readme_raw,
        thumbnail: first_image
    }
    
    return databaseJson;
}

async function fetch_text(url : string) {
    let settings = {method: "GET"};
    let res = await fetch(url, settings);
    let text = await res.text();

    return text;
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

function fix_url(url : string, repo_url : string) : string {
    if (url.startsWith("https://") || url.startsWith("http://")) {
        return url;
    }
    if (url.startsWith("./")) {
        return repo_url + url.slice(1);
    }
    if (url.startsWith("/")) {
        return repo_url + url;
    }
    return repo_url + "/" + url;
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
