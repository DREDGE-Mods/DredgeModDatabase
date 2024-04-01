const core = require("@actions/core");
const fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";

async function run() {
    core.info("Checking for mod updates to post to discord");
    var newDB = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database.json','utf8'));
    var oldDB = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database/database.json','utf8'));

    const oldDBDict: Record<string, DatabaseModInfo> = {};

    for (const mod of oldDB) {
        oldDBDict[mod.mod_guid] = mod;
    }

    for (const newMod of newDB) {
        if (newMod.mod_guid in oldDBDict) {
            const oldMod = oldDBDict[newMod.mod_guid];
            // Check for updates
            if (newMod.latest_version != oldMod.latest_version) {
                core.info(newMod.name + " was updated from " + oldMod.latest_version + " to " + newMod.latest_version);
            }
            else {
                core.info(newMod.name + " was unchanged");
            }
        }
        else {
            // New mod just released!
            core.info(newMod.name + " was just added to the database!");
        }
    }
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
