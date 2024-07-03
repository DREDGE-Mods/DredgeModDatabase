import { Octokit } from "@octokit/core";
import type { OctokitResponse } from "@octokit/types";
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { getLatestDate } from "./dates";
const fetch = require("node-fetch");

// It's useful to log the API call count,
// but replacing the fetch function seems to some times cause the "premature close" error.
// So it's disabled by default.
const LOG_API_CALL_COUNTS = false;

export let apiCallCount = 0;

type OctokitRepo = RestEndpointMethodTypes["repos"]["get"]["response"]["data"];
type OctokitRelease =
	RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][number];
type OctokitReleaseAsset =
	OctokitRelease["assets"][number];
type OctokitReleaseResponse =
	OctokitResponse<OctokitRelease[]>;
type CleanedUpRelease = {
    download_url: string;
    download_count: number;
    version: string;
    creation_date: string;
    update_date: string;
    description: string;
}

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

export function getRepoUpdatedAt(repository: OctokitRepo) {
  return getLatestDate(repository.updated_at, repository.pushed_at);
}

export function getCleanedUpRelease(release: OctokitRelease, assetPredicate: (asset: OctokitReleaseAsset) => boolean) : CleanedUpRelease {
  const asset = release.assets[release.assets.findIndex(assetPredicate)];

  return {
    download_url: asset.browser_download_url,
    download_count: asset.download_count,
    version: release.tag_name,
    creation_date: release.created_at,
    update_date: asset.updated_at,
    description: release.body || "",
  };
}

export function getCleanedUpReleaseList(releaseList: OctokitRelease[], assetPredicate: (asset: OctokitReleaseAsset) => boolean) : CleanedUpRelease[] {
  return releaseList
    .filter(({ assets }) => assets.length > 0 && assets.some(assetPredicate))
    .map((release: OctokitRelease) => getCleanedUpRelease(release, assetPredicate));
}

export async function getAllReleases(
  octokit: Octokit,
  owner: string,
  repo: string
) : Promise<OctokitReleaseResponse> {
  return (
    await getRestEndpointMethods(octokit).repos.listReleases({
	  owner,
	  repo,
	  per_page: 100,
	})
  );
}