const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
  core.info("Test " + github.context.eventName);
}

run().catch((error) => core.setFailed("Workflow failed! " + error.message));
