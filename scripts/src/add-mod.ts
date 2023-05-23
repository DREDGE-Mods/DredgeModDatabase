const core = require("@actions/core");
import mod_list from "../../mods.json";
const fs = require("fs");

type IssueForm = {
    name : string,
    mod_guid: string,
    repo : string,
    download : string
}

async function run() {
    core.info("Adding new mod to database");

    const issueForm : IssueForm = JSON.parse(core.getInput("submission-form"));
    
    core.info("Found issue " + JSON.stringify(issueForm, null, 2));

    let repo = issueForm.repo.match(/github\.com\/([^/]+\/[^/]+)\/?.*/)?.[1];

    if (!repo) {
        throw new Error("Invalid repo URL " + issueForm.repo);
    }

    if (repo.endsWith(".git")) {
        repo = repo.slice(0, -4);
    }

    if (!issueForm.download.endsWith(".zip")) {
        throw new Error("Invalid download " + issueForm.download + " - Expected a zip file");
    }

    const existingMod = mod_list.mods.find(
        (mod) => issueForm.mod_guid == mod.mod_guid
    );

    if (existingMod) {
        existingMod.name = issueForm.name;
        existingMod.repo = repo;
        existingMod.download = issueForm.download;
    }
    else {
        let newMod : ModInfo =  {
            name: issueForm.name,
            mod_guid: issueForm.mod_guid,
            repo: issueForm.repo,
            download: issueForm.download
        }
        mod_list.mods = mod_list.mods.concat(newMod);
    }

    let json = JSON.stringify(mod_list, null, 2);

    fs.writeFile("mods.json", json, 'utf8', (err : Error) => {
        if (err) {
            throw new Error(err.message);
        }
        else {
            core.info("Saved mods list with new mod added");
        }
    });
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
