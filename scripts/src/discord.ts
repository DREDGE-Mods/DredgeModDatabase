const core = require("@actions/core");
const fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";

async function run() {
    core.info("Checking for mod updates to post to discord");

    if (process.env["DISCORD_WEBHOOK"] == null) {
        core.error("Need to set DISCORD_WEBHOOK secret to post notifications!");
        return;
    }

    var webhookUrl = <string>process.env["DISCORD_WEBHOOK"];

    var newDB = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database/database.json','utf8'));
    var oldDB = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database/old_database.json','utf8'));

    const oldDBDict: Record<string, DatabaseModInfo> = {};

    var postedRepos : string[] = new Array();

    for (const mod of oldDB) {
        oldDBDict[mod.mod_guid] = mod;
    }

    // New mods
    for (const newMod of newDB) {
        // Assume that if one central repo mod is updated it will have changelogs for all others
        if (postedRepos.includes(newMod.repo))
            continue;
        postedRepos.push(newMod.repo);

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

export async function SendNotification(webhookUrl : string, mod : DatabaseModInfo, oldMod : DatabaseModInfo | null) {
    try{
        var payload = GetModUpdatePayload(mod, oldMod);
    
        await SendPayload(webhookUrl, payload);
    }
    catch (error) {
        core.error(`Failed to send Discord notification: ${error}`);
    }
}

export async function SendPayload(webhookUrl : string, payload : any) {
    let message : any = {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            embeds: [ payload ]
        })
    };

    core.info(JSON.stringify(message, null, 2));

    await fetch(webhookUrl, message)
    .then((response : any) => {
        if (!response.ok) {
            core.error(`Discord API post response not ok. ${response.status}: ${response.statusText}`);
            return response.json()
        }
    }).then((data : any) => {
        core.error(JSON.stringify(data))
    });
}

function GetModUpdatePayload(mod : DatabaseModInfo, oldMod : DatabaseModInfo | null) {
    const isUpdate = oldMod != null;

    var title = !isUpdate ? mod.name + " was just added to the database!" : `${mod.name} was just updated!\n${oldMod.latest_version} → **${mod.latest_version}**`
    var colour = !isUpdate ? 3066993 : 15105570;

    // When a new mod is added just put the description, for updates include the description of the latest release
    var description = (oldMod === null ? mod.description : mod.latest_release_description) ?? "A mod for DREDGE";

    const maxLength = 4000; // Max length of a Discord embed description is 4096, have to leave room for the title though.
    const truncatedDisclaimer = '**...**\n\n**Check the mod repo for the complete changelog.**';
    const endPosition = maxLength - 1 - truncatedDisclaimer.length;

    core.info(description)
    if (description && description.length > maxLength) {
        description = description.slice(0, endPosition);
        // Don't slice in the middle of a word
        let lastIndex = description.lastIndexOf(' ');
        let lastChar = description[lastIndex-1];
        if (lastChar && lastChar.match(/^[.,:!?]/)) {
            lastIndex--;
        }
        description = description.slice(0, lastIndex);
        // Try to respect markdown links in the form [text text text](website.something.whatever)
        // Because we only slice at spaces we just have to check if we're inside square brackets
        let openSquareBracket = description.lastIndexOf("[");
        let closeSquareBracket = description.lastIndexOf("]");
        if (openSquareBracket != -1 && (closeSquareBracket == -1 || closeSquareBracket < openSquareBracket)) 
        {
            description = description.slice(0, openSquareBracket);
        }
        description += truncatedDisclaimer;
    }

    var authorName = mod.author;
    var profilePicture = `https://github.com/${mod.repo.split("/")[0]}.png`

    let slug = mod.name.toLowerCase().trim().split(" ").join("_");

    let thumbnail = "https://raw.githubusercontent.com/DREDGE-Mods/DredgeModDatabase/database/thumbnails/" + mod.thumbnail?.split(" ").join("%20");

    return {
        type: "rich",
        title: mod.name,
        description: `${title}\n>>> ${description}`,
        fields: [
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
