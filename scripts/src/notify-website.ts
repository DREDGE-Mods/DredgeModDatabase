const core = require("@actions/core");
const fetch = require("node-fetch");
const fs = require("fs");
const octo = require("octokit")
import "./mod-info";

async function run() {
    /*
    core.info("Checking for added mods to refresh website");

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

            return;
        }
    }
    */

    // Instead of running on a separate schedule, update the site whenever the database is updated
    UpdateWebsite();
}

async function UpdateWebsite() {
    try {    
        const octokit = new octo.Octokit({
            auth: process.env["GITHUB_TOKEN"],
            request: {
                fetch: fetch
            }
        })

        await octokit.request('POST /repos/DREDGE-Mods/DredgeModsWebsite/dispatches', {
            event_type: 'Database Updated',
            client_payload: {
              unit: false,
              integration: true
            },
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
    }
    catch (error) {
        core.error(`Failed to send Website notification: ${error}`);
    }
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
