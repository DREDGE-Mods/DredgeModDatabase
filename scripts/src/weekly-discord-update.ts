const core = require("@actions/core");
const node_fetch = require("node-fetch");
const fs = require("fs");
import "./mod-info";
import mod_list from "../../mods.json";

function compareDownloads(a : any, b : any) {
    let modA, downloadsA
    [modA, downloadsA] = a

    let modB, downloadsB
    [modB, downloadsB] = b

    return downloadsB - downloadsA
}

async function run() {
    core.info("Checking for most downloaded mods this week!");

    if (process.env["DISCORD_WEBHOOK"] == null) {
        core.error("Need to set DISCORD_WEBHOOK secret to post notifications!");
        return;
    }

    var webhookUrl = <string>process.env["DISCORD_WEBHOOK"];

    var db = <DatabaseModInfo[]>JSON.parse(fs.readFileSync('./database/database.json','utf8'));

    await fetch_json("https://raw.githubusercontent.com/DREDGE-Mods/DredgeModDownloadTracker/main/scripts/downloads.json").then((downloadJson) => {
        core.info("Got the download json")
        
        var date = Object.keys(downloadJson)[Object.keys(downloadJson).length-1]
        var dmy = date.split("/")

        var dateObject = new Date()
        dateObject.setFullYear(Number(dmy[2]), Number(dmy[1]) - 1, Number(dmy[0]))

        var lastWeek = new Date(dateObject.getTime() - 7 * 24 * 60 * 60 * 1000)
        var lastWeekDMY = lastWeek.getDate() + "/" + (lastWeek.getMonth() + 1) + "/" + lastWeek.getFullYear()
        
        core.info("Today is " + date + " and last week was " + lastWeekDMY)

        var todayDownloads = downloadJson[date]
        var lastWeekDownloads = downloadJson[lastWeekDMY]

        let newMods : string[] = [] 

        var downloadsThisWeek : any = []
        Object.keys(todayDownloads).forEach((key) => {
            var now = todayDownloads[key]
            var old = lastWeekDownloads.hasOwnProperty(key) ? lastWeekDownloads[key] : 0
            if (old == 0) {
                newMods.push(key)
            }
            downloadsThisWeek.push([key, now - old])
        })

        downloadsThisWeek = downloadsThisWeek.sort(compareDownloads)

        // Top 5
        var topFive = []
        let index = 0
        let count = 0
        while (count < 5) {
            if (downloadsThisWeek[index][0] != "hacktix.winch") {
                topFive.push(downloadsThisWeek[index])
                count++
            }
            index++
        }

        postTopFive(topFive, newMods, db, webhookUrl);
    });

}

async function postTopFive(topFive : any, newMods : string[], db : any[], webhookUrl : string) {
    var text = "📈 Most downloaded mods this week:\n"
    for (let i = 0; i < 5; i++) {
        var unique_id = topFive[i][0]
        var modName = db.find(function (mod) {
            return mod.mod_guid == unique_id
        }).name
        var downloads = topFive[i][1]
        text += ("\n**" + (i+1) + ":** *" + modName + "* - __" + downloads + "__ downloads!")
    }
    
    if (newMods.length == 0) {
        text += "\n\n❌ No new mods were released this week"
    }
    else {
        text += "\n\n🎉 New mods this week:"
        newMods.forEach((mod_guid) => {
            var modInfo = db.find(function (mod) {
                return mod.mod_guid == mod_guid
            })
            text += "\n" + modInfo.name + " by " + modInfo.author
        })
    }
    
    core.info(text)

    SendNotification(webhookUrl, text)
}

async function fetch_json(url : string) {
    let settings = {method: "GET"};
    let res = await node_fetch(url, settings);
    let json = await res.json();

    if (json.hasOwnProperty("message") && (json["message"] as string).includes("API rate limit exceeded")) {
        throw new Error(json["message"]);
    }

    return json;
}

export async function SendNotification(webhookUrl : string, text: string) {
    try{
        var payload = {
            type: "rich",
            title: "Weekly mods update!",
            description: text
        };
    
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

run().catch((error) => core.setFailed("Workflow failed! " + error.message));