const core = require("@actions/core");
const fetch = require("node-fetch");
const fs = require("fs");
const octo = require("octokit")
import "./mod-info";

async function run() {
    core.info("Checking for added mods to refresh website");

    UpdateWebsite();

    var newDB = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database/database.json','utf8'));
    var oldDB = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database/old_database.json','utf8'));

    const oldDBDict: Record<string, DatabaseModInfo> = {};

    for (const mod of oldDB) {
        oldDBDict[mod.mod_guid] = mod;
    }

    for (const newMod of newDB) {
        if (!(newMod.mod_guid in oldDBDict)) {
            // New mod just released!
            core.info(newMod.name + " was just added to the database!");
            UpdateWebsite();
            return;
        }
    }
}

async function UpdateWebsite() {
    try {    
        const octokit = new octo.Octokit({
            auth: process.env["GITHUB_TOKEN"],
            request: {
                fetch: fetch
            }
        })

        const response = await octokit.request('POST /repos/{owner}/{repo}/dispatches', {
            owner: 'DREDGE-Mods',
            repo: 'DredgeModsWebsite',
            event_type: 'mod_added',
            client_payload: {
              unit: false,
              integration: true
            },
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
    
        if (!response.ok) {
            core.error(`API post response not ok. ${response.status}: ${response.statusText}`);
        }
    }
    catch (error) {
        core.error(`Failed to send Website notification: ${error}`);
    }
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
