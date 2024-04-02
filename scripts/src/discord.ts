const core = require("@actions/core");
const fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";

async function run() {
    core.info("Checking for mod updates to post to discord");

    /* Local testing
    var newMod : DatabaseModInfo = {
        "name": "Cosmic Horror Fishing Buddies",
        "author": "xen-42",
        "repo": "xen-42/cosmic-horror-fishing-buddies",
        "latest_version": "1.0.0",
        "mod_guid": "xen.cosmichorrorfishingbuddies",
        "downloads": 3,
        "download": "xen.CosmicHorrorFishingBuddies.zip",
        "thumbnail": "Cosmic Horror Fishing Buddies.webp"
    }

    var oldMod : DatabaseModInfo = {
        "name": "Cosmic Horror Fishing Buddies",
        "author": "xen-42",
        "repo": "xen-42/cosmic-horror-fishing-buddies",
        "latest_version": "0.1.0",
        "mod_guid": "xen.cosmichorrorfishingbuddies",
        "downloads": 3,
        "download": "xen.CosmicHorrorFishingBuddies.zip",
        "thumbnail": "Cosmic Horror Fishing Buddies.webp"
    }
    
    SendNotification(url, newMod, null);
    SendNotification(url, newMod, oldMod);

    return;
    */

    if (process.env["DISCORD_WEBHOOK"] == null) {
        core.error("Need to set DISCORD_WEBHOOK secret to post notifications!");
        return;
    }

    var webhookUrl = <string>process.env["DISCORD_WEBHOOK"];

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
                SendNotification(webhookUrl, newMod, oldMod);
            }
            else {
                core.info(newMod.name + " was unchanged");
            }
        }
        else {
            // New mod just released!
            core.info(newMod.name + " was just added to the database!");
            SendNotification(webhookUrl, newMod, null);
        }
    }
}

async function SendNotification(webhookUrl : string, mod : DatabaseModInfo, oldMod : DatabaseModInfo | null) {
    try{
        var payload = GetModUpdatePayload(mod, oldMod);

        core.info(JSON.stringify(payload));

        const isUpdate = oldMod != null;
    
        const response = await fetch(webhookUrl, {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                embeds: [ payload ]
            })
        });
    
        if (!response.ok) {
            core.error(`Discord API post response not ok. ${response.status}: ${response.statusText}`);
        }
    }
    catch (error) {
        core.error(`Failed to send Discord notification: ${error}`);
    }
}

function GetModUpdatePayload(mod : DatabaseModInfo, oldMod : DatabaseModInfo | null) {
    const isUpdate = oldMod != null;

    var title = !isUpdate ? mod.name + " was just added to the database!" : `${mod.name} was just updated!\n${oldMod.latest_version} → **${mod.latest_version}**`
    var colour = !isUpdate ? 3066993 : 15105570;

    var description = mod.description;

    var authorName = mod.author;
    var profilePicture = `https://github.com/${mod.repo.split("/")[0]}.png`

    let slug = mod.name.toLowerCase().trim().split(" ").join("_");

    let thumbnail = "https://raw.githubusercontent.com/DREDGE-Mods/DredgeModDatabase/database/thumbnails/" + mod.thumbnail?.split(" ").join("%20");

    return {
        type: "rich",
        title: mod.name,
        fields: [
          {
            name: title,
            value: description,
          },
          {
            name: "\u200B",
            value: `\n<:github:1085179483784499260> [Source Code](https://github.com/${mod.repo})`,
          }
        ],
        author: {
          name: authorName,
          icon_url: profilePicture,
        },
        url: `https://dredgemods.com/mods/${slug}`,
        color: colour,
        image: {
          url: thumbnail,
        }
      };
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
