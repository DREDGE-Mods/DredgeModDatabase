const core = require("@actions/core");
import _mod_list from "../../mods.json";
const fs = require("fs");

type IssueForm = {
    name : string,
    mod_guid: string,
    repo : string,
    download : string,
    description? : string,
    author? : string
}

async function run() {
    core.info("Adding new mod to database");

    var mod_list = _mod_list as { mods : Array<ModInfo> };

    let submission = core.getInput("submission-form");

    core.info("Found issue " + submission);

    const issueForm : IssueForm = JSON.parse(submission);

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
        
        set_optional_fields(existingMod, issueForm);
    }
    else {
        let newMod : ModInfo =  {
            name: issueForm.name,
            mod_guid: issueForm.mod_guid,
            repo: repo,
            download: issueForm.download
        }

        set_optional_fields(newMod, issueForm);

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

function set_optional_fields(mod : ModInfo, issueForm : IssueForm) {
    if (!is_empty(issueForm.author)) mod.author = issueForm.author;
    else mod.author = undefined;

    if (!is_empty(issueForm.description)) mod.description = issueForm.description;
    else mod.description = undefined;
}

function is_empty(s : string | undefined) {
    return s == null || s.length == 0;
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
