import { Octokit } from "@octokit/core";
import type { OctokitResponse } from "@octokit/types";
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
const fetch = require("node-fetch");

// It's useful to log the API call count,
// but replacing the fetch function seems to some times cause the "premature close" error.
// So it's disabled by default.
const LOG_API_CALL_COUNTS = false;

export let apiCallCount = 0;

type OctokitRepo = RestEndpointMethodTypes["repos"]["get"]["response"]["data"];

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

export function getRestEndpointMethods(octokit: Octokit) {
  return restEndpointMethods(octokit).rest;
}

export async function getRepository(
  octokit: Octokit,
  owner: string,
  repo: string
) : Promise<OctokitResponse<OctokitRepo>> {
  return (
	await getRestEndpointMethods(octokit).repos.get({
	  owner,
	  repo,
	})
  );
}

