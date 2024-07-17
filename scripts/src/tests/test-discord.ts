const core = require("@actions/core");
import "../mod-info";
import {SendNotification, SendPayload} from "../discord";

async function run() {
    core.info("Started discord webhook test");

    let url = ""

    var newMod : DatabaseModInfo = {
        "name": "Cosmic Horror Fishing Buddies",
        "author": "xen-42",
        "repo": "xen-42/cosmic-horror-fishing-buddies",
        "latest_version": "1.0.0",
        "mod_guid": "xen.cosmichorrorfishingbuddies",
        "downloads": 3,
        "download": "xen.CosmicHorrorFishingBuddies.zip",
        "thumbnail": "Cosmic Horror Fishing Buddies.webp",
        "slug": "mods/cosmic_horror_fishing_buddies/"
    }

    var oldMod : DatabaseModInfo = {
        "name": "Cosmic Horror Fishing Buddies",
        "author": "xen-42",
        "repo": "xen-42/cosmic-horror-fishing-buddies",
        "latest_version": "0.1.0",
        "mod_guid": "xen.cosmichorrorfishingbuddies",
        "downloads": 3,
        "download": "xen.CosmicHorrorFishingBuddies.zip",
        "thumbnail": "Cosmic Horror Fishing Buddies.webp",
        "slug": "mods/cosmic_horror_fishing_buddies/"
    }
    
    SendNotification(url, newMod, null);
    SendNotification(url, newMod, oldMod);
}


run().catch((error) => core.setFailed("Test failed! " + error.message));