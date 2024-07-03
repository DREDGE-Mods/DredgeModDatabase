import { Octokit } from "@octokit/core";
const fetch = require("node-fetch");

// It's useful to log the API call count,
// but replacing the fetch function seems to some times cause the "premature close" error.
// So it's disabled by default.
const LOG_API_CALL_COUNTS = false;

export let apiCallCount = 0;


function createOctokit() {
  return new Octokit({
	auth: process.env["GITHUB_TOKEN"],
    request: {
		fetch: LOG_API_CALL_COUNTS ? (...parameters: Parameters<typeof fetch>) => {
		  apiCallCount++;
		  return fetch(...parameters);
		} : fetch
	  }
  });
}

export type CreatedOctokit = ReturnType<typeof createOctokit>;
let createdOctokit: CreatedOctokit;

export function getOctokit() {
  if (!createdOctokit) {
    createdOctokit = createOctokit();
  }
  return createdOctokit;
}
