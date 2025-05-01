const core = require("@actions/core");
import mod_list from "../../mods.json";
const fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";
import { generateModThumbnail } from "./create-thumbnail";
import { Octokit } from "@octokit/core";
import {
  getOctokit,
  getRestEndpointMethods,
  getCleanedUpRelease,
  getCleanedUpReleaseList,
  getRepoUpdatedAt,
  getAllReleases,
  getRepository
} from "./octokit";

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
    const octokit = getOctokit();

    const [owner, repo] = mod.repo.split("/");

    // Get data from API
    const repository = (await getRepository(octokit, owner, repo)).data;

    const repo_updated_at = getRepoUpdatedAt(repository);

    const fullReleaseList = (await getAllReleases(octokit, owner, repo)).data
    .sort(
      (releaseA, releaseB) =>
        new Date(releaseB.created_at).valueOf() -
        new Date(releaseA.created_at).valueOf()
    )
    .filter((release) => !release.draft);

    const isDownloadAsset = (asset : { name : string, download_count : number }) => (asset.name == mod.download);

    const prereleaseList = fullReleaseList.filter(
      (release) =>
        release.prerelease &&
        release.assets.some(isDownloadAsset)
    );

    const releaseList = fullReleaseList.filter(
      (release) =>
        !release.prerelease &&
        release.assets.some(isDownloadAsset)
    );

    const latestRelease = releaseList[0];

    if (!latestRelease) {
      throw new Error(
        "Failed to find latest release from either release list or latest release endpoint"
      );
    }

    const releases = getCleanedUpReleaseList(releaseList, isDownloadAsset);
    const prereleases = getCleanedUpReleaseList(prereleaseList, isDownloadAsset);
    const cleanLatestRelease = getCleanedUpRelease(latestRelease, isDownloadAsset);
    
    const firstReleaseDate = (releases[releases.length - 1] ?? cleanLatestRelease).creation_date;

    // Get download count
    // For mods that changed their zip name, we set the initial value to the previous download count since it checks by the file name
    const download_count = ([...releases, ...prereleases].reduce(
      (accumulator, release) => {
        return accumulator + release.download_count;
      },
      mod.downloads_offset ?? 0
    ));


    let default_branch = repository.default_branch;

    let readme_path = mod.readme_path ?? "README.md";
    let readme_url = "https://github.com/" + mod.repo + "/blob/" + default_branch + "/" + readme_path;
    let repo_root = "https://raw.githubusercontent.com/" + mod.repo + "/" + default_branch;
    let readme_raw = repo_root + "/" +  readme_path;

    // Get the first image in the readme, if there is one, but make sure it isn't from img.shields.io
    let readme_plain_text = await fetch_text(readme_raw);
    let imageRegex = /(!\[.*\]\(.*)\)|\<img.+src\=(?:\"|\')(.+?)(?:\"|\')(?:.+?)\>/g
    var imageResults = readme_plain_text.match(imageRegex);
    let first_image : string = "";
    if (imageResults != null) {
        for (let i = 0; i < imageResults.length; i++) {
            var image = imageResults[i]
            console.log(mod.name + " " + i + " " + image);
            if (!image.includes("img.shields.io") && !image.includes("badge")) {
                if (image.includes("<img")) {
                    // Extract just the url from it
                    var first_image_match = image.match(/\<img.+src\=(?:\"|\')(.+?)(?:\"|\')(?:.+?)\>/);
                    if (first_image_match != null) {
                        try {
                            let image_url = fix_url(first_image_match[1], readme_raw)
                            first_image = await generateModThumbnail(mod.name, image_url)
                            break;
                        }
                        catch (error) {
                            first_image = "";
                            core.info(`Threw error trying to get image for ${mod.name}\n${first_image_match}\n${error}`);
                            continue;
                        }
                    }
                }
                else {
                    // Extract just the url from it
                    var first_image_match = image.match(/(!\[.*\]\()(.*)\)/);
                    if (first_image_match != null) {
                        try {
                            let image_url = fix_url(first_image_match[2], readme_raw)
                            first_image = await generateModThumbnail(mod.name, image_url)
                            break;
                        }
                        catch (error) {
                            first_image = "";
                            core.info(`Threw error trying to get image for ${mod.name}\n${first_image_match}\n${error}`);
                            continue;
                        }
                    }
                }
            }
        }
    }

    var description = !is_empty(mod.description) ? mod.description : (repository.description != null ? repository.description : undefined);
    
    // Release description
    var latestReleaseDescription = cleanLatestRelease.description;

    let databaseJson : DatabaseModInfo = {
        name : mod.name,
        slug : mod.name.trim().toLowerCase().replace(/\s/g, "_"),
        mod_guid : mod.mod_guid,
        repo : mod.repo,
        download : mod.download,
        author : !is_empty(mod.author) ? mod.author : mod.repo.split("/")[0],
        description : description,
        repo_creation_date : repository.created_at,
        repo_update_date : repo_updated_at,
        release_date : firstReleaseDate,
        asset_update_date : cleanLatestRelease.update_date,
        latest_version: cleanLatestRelease.version,
        downloads: download_count,
        readme_url: readme_url,
        readme_raw: readme_raw,
        thumbnail: first_image,
        latest_release_description: !is_empty(latestReleaseDescription) ? latestReleaseDescription : description
    }
    
    return databaseJson;
}

async function fetch_text(url : string) {
    let settings = {method: "GET"};
    let res = await fetch(url, settings);
    let text = await res.text();

    return text;
}

async function fetch_json(octokit : Octokit, url : string) {
    let res = await octokit.request("GET " + url);
    let json = res.data;

    if (json.hasOwnProperty("message") && (json["message"] as string).includes("API rate limit exceeded")) {
        throw new Error(json["message"]);
    }

    return json;
}

function is_empty(s : string | undefined) {
    return s == null || s.length == 0;
}

  /**
   * Trims slash at the end of URL if needed
   * @param url URL
   */
function trimSlash(url: string): string {
  if (url.lastIndexOf('/') === url.length - 1)
    return url.slice(0, -1);
  return url;
}

/**
 * Returns directory url from file url
   * @param itemUrl file URL
 */
function getDirectoryUrl(itemUrl: string) : string {
  const urlTokens = itemUrl.split("?");
  const url = trimSlash(urlTokens[0]);
  return url.slice(0, url.lastIndexOf('/'));
}

function doubleDotSlash(repo_url: string, file_url: string) : string {
    var fixed_repo_url = getDirectoryUrl(repo_url);
    var fixed_file_url = file_url.slice(3);
    if (fixed_file_url.startsWith("../")){
        return doubleDotSlash(fixed_repo_url, fixed_file_url);
    }
    return fixed_repo_url + "/" + fixed_file_url
}

function fix_url(url : string, readme_url : string) : string {
    if (url.startsWith("https://") || url.startsWith("http://")) {

        // Fix for embedding an image that is part of the github repo 
        // eg must change
        // https://github.com/alextric234/ArchipelagoDredgeMod/blob/main/ArchipelagoDredge/Assets/ArchipelagoDredge.jpg
        // into
        // https://raw.githubusercontent.com/alextric234/ArchipelagoDredgeMod/refs/heads/main/ArchipelagoDredge/Assets/ArchipelagoDredge.jpg
        if (url.includes("https://github.com/")) {
            url = url.replace("https://github.com/", "https://raw.githubusercontent.com/")
            // if somebody puts a file in a folder called "blob" this will break but I do not care
            url = url.replace("/blob/", "/refs/heads/")
        }

        return url;
    }
    const repo_url = getDirectoryUrl(readme_url);
    if (url.startsWith("./")) {
        return repo_url + url.slice(1);
    }
    if (url.startsWith("../")) {
        return doubleDotSlash(repo_url, url);
    }
    if (url.startsWith("/")) {
        return repo_url + url;
    }
    return repo_url + "/" + url;
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
